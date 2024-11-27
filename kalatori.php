<?php


use PrestaShop\PrestaShop\Core\Payment\PaymentOption;

if (!defined('_PS_VERSION_')) exit;

class Kalatori extends PaymentModule
{
    const FLAG_DISPLAY_PAYMENT_INVITE = 'DOT_PAYMENT_INVITE';

    protected $_html = '';
    protected $_postErrors = [];

    public $details;
    public $daemon;
    public $address;

    public function __construct()
    {
        $this->name = 'kalatori';
        $this->tab = 'payments_gateways';
        $this->version = '1.0.2';
        $this->ps_versions_compliancy = ['min' => '1.7.6.0', 'max' => _PS_VERSION_];
        $this->author = 'Alzymologist Oy';
        $this->controllers = ['ajax', 'payment', 'validation'];
        $this->is_eu_compatible = 1;

        $this->DOT_URL_DEFAULT = 'http://localhost:16726';
        $this->DOT_NAME_DEFAULT = 'PrestaShop';
        $this->DOT_CURRENCIES_DEFAULT = ''; // TODO: Check if we can remove this

        $this->currencies = true;
        $this->currencies_mode = 'checkbox';

	    $this->fields_need=['DOT_NAME','DOT_URL', 'DOT_CURRENCIES'];

        $config = Configuration::getMultiple($this->fields_need);

        foreach($this->fields_need as $l) $this->{$l} = ( empty($config[$l]) ? $this->{$l.'_DEFAULT'} : $config[$l] );

        $this->bootstrap = true;
        parent::__construct();

        $this->displayName = $this->trans('Kalatori Web3 Crypto Payments', [], 'Modules.Kalatori.Admin');
        $this->description = $this->trans('Accept crypto payments using kalatori self-hosted crypto payment gateway.', [], 'Modules.Kalatori.Admin');
        $this->confirmUninstall = $this->trans('Are you sure you want to uninstall?', [], 'Modules.Kalatori.Admin');

        if ((!isset($this->daemon)) && $this->active) {
            $this->warning = $this->trans('Daemon must be configured before using this module.', [], 'Modules.Kalatori.Admin');
        }

        if (!count(Currency::checkPaymentCurrencies($this->id)) && $this->active) {
            $this->warning = $this->trans('No currency has been set for this module.', [], 'Modules.Kalatori.Admin');
        }
    }

    public function install()
    {
        Configuration::updateValue(self::FLAG_DISPLAY_PAYMENT_INVITE, true);
        return parent::install()
            && $this->registerHook('displayPaymentReturn')
            && $this->registerHook('paymentOptions');
    }

    public function uninstall()
    {
        foreach($this->fields_need as $l) { if( !Configuration::deleteByName($l) ) return false; }
	    if( !Configuration::deleteByName(self::FLAG_DISPLAY_PAYMENT_INVITE) ) return false;
	    if( !parent::uninstall() ) return false;

        // TODO: Check all the fields we add to the configuration and cklan them up
        return true;
    }

    protected function _postValidation()
    {
        if (Tools::isSubmit('btnSubmit')) {

            Configuration::updateValue(
                self::FLAG_DISPLAY_PAYMENT_INVITE,
                Tools::getValue(self::FLAG_DISPLAY_PAYMENT_INVITE)
            );

	/*
            if (!Tools::getValue('DOT_URL')) {
                $this->_postErrors[] = $this->trans(
                    'Url daemon is required.',
                    [],
                    'Modules.Kalatori.Admin'
                );
            }
	*/

        }
    }

    protected function _postProcess()
    {
        if (Tools::isSubmit('btnSubmit')) {

	    foreach($this->fields_need as $l) Configuration::updateValue($l, Tools::getValue($l));

	    /*
            $custom_text = [];
            $languages = Language::getLanguages(false);
            foreach ($languages as $lang) {
                if (Tools::getIsset('DOT_CUSTOM_TEXT_' . $lang['id_lang'])) {
                    $custom_text[$lang['id_lang']] = Tools::getValue('DOT_CUSTOM_TEXT_' . $lang['id_lang']);
                }
            }
            Configuration::updateValue('DOT_CUSTOM_TEXT', $custom_text);
	    */
        }
        $this->_html .= $this->displayConfirmation($this->trans('Settings updated', [], 'Admin.Global'));
    }

    protected function _displayDot()
    {
        return $this->display(__FILE__, 'infos.tpl');
    }

    public function getContent()
    {
        if (Tools::isSubmit('btnSubmit')) {
            $this->_postValidation();
            if (!count($this->_postErrors)) {
                $this->_postProcess();
            } else {
                foreach ($this->_postErrors as $err) {
                    $this->_html .= $this->displayError($err);
                }
            }
        } else {
            $this->_html .= '<br />';
        }

        $this->_html .= $this->_displayDot();
        $this->_html .= $this->renderForm();

        return $this->_html;
    }

    public function hookPaymentOptions($params)
    {
        if (!$this->active) return [];

        $cart = $params['cart'];
        // if (false === Validate::isLoadedObject($cart) || false === $this->checkCurrency($cart)) return [];

        $this->smarty->assign(
            $this->getTemplateVarInfos()
        );

//        if (empty($params['order'])) { die("NP ");  }
//        $order = $params['order'];
//	    die("<pre>".print_r($params['cart'],1));

/*
        if ($order->getOrderPaymentCollection()->count()) {
            $orderPayment = $order->getOrderPaymentCollection()->getFirst();
            $transaction = $orderPayment->transaction_id;
	    die("<pre>".print_r($order,1));
        } else
*/
// die("NOT");

        $newOption = new PaymentOption();
        $newOption ->setModuleName($this->name)
                ->setLogo(_MODULE_DIR_ . '/kalatori/views/img/polkadot.webp')
                ->setCallToActionText($this->trans('Pay with Crypto', [], 'Modules.Kalatori.Shop'))
                ->setAction( $this->context->link->getModuleLink($this->name, 'validation', [], true) )
                ->setAdditionalInformation($this->fetch('module:kalatori/views/templates/front/dotpay.tpl'))
/*
		->setInputs([
            'token' => [
                'name' => 'token',
                'type' => 'text',
                'value' => '[5cbfniD+gEV<59lYbG/,3VmHiE<U46;#G9*#NP#X.FA§]sb%ZG?5Q{xQ4#VM|7',
            ],
        ])
*/
	;
        return [ $newOption ];
    }


    public function hookDisplayPaymentReturn($params)
    {
//     $this->context->controller->addJS([   $this->module->getPathUri() . 'QQQQQQQQQQQ.js'   ]);
//  die('######################');

        if (!$this->active || !Configuration::get(self::FLAG_DISPLAY_PAYMENT_INVITE)) return;

        $dotDaemon = $this->daemon;
        if (!$dotDaemon) $dotDaemon = '___________';

        $totalToPaid = $params['order']->getOrdersTotalPaid() - $params['order']->getTotalPaid();
        $this->smarty->assign([
            'shop_name' => $this->context->shop->name,
            'total' => $this->context->getCurrentLocale()->formatPrice(
                $totalToPaid,
                (new Currency($params['order']->id_currency))->iso_code
            ),
            'dotDetails' => $dotDetails,
            'dotAddress' => $dotAddress,
            'dotDaemon' => $dotDaemon,
            'status' => 'ok',
            'reference' => $params['order']->reference,
            'contact_url' => $this->context->link->getPageLink('contact', true),
        ]);

        return $this->fetch('module:kalatori/views/templates/hook/payment_return.tpl');
    }

/*
    public function checkCurrency($cart)
    {
        $currency_order = new Currency($cart->id_currency);
        $currencies_module = $this->getCurrency($cart->id_currency);

        if (is_array($currencies_module)) {
            foreach ($currencies_module as $currency_module) {
                if ($currency_order->id == $currency_module['id_currency']) {
                    return true;
                }
            }
        }

        return false;
    }
*/

    public function renderForm()
    {
        $fields_form = [
            'form' => [
                'legend' => [
                    'title' => $this->trans('Account details', [], 'Modules.Kalatori.Admin'),
                    'icon' => 'icon-envelope',
                ],

                'input' => [
                    [
                        'name' => 'DOT_NAME',
                        'label' => $this->trans('Store name', [], 'Modules.Kalatori.Admin'),
                        'desc' => $this->trans('Enter a unique name if you are using a daemon with multiple stores, otherwise leave it blank', [], 'Modules.Kalatori.Admin'),
                        'type' => 'text',
                        'required' => false,
                    ],

                    [
                        'name' => 'DOT_CURRENCIES',
                        'label' => $this->trans('Enabled currencies', [], 'Modules.Kalatori.Admin'),
			'placeholder' => '',
                        'desc' => $this->trans('Leave blank to enable all available currencies', [], 'Modules.Kalatori.Admin'),
                        'type' => 'text',
			'id' => 'kalatori_currencies',
                        'required' => false,
                    ],

                    [
                        'name' => 'DOT_URL',
                        'label' => $this->trans('Daemon url', [], 'Modules.Kalatori.Admin'),
			'placeholder' => $this->DOT_URL_DEFAULT, // http://localhost:16726
                        'desc' =>
"<script>

function kalatori_pin(e) { e = e.innerHTML;
    var o={}, w = document.querySelector('#kalatori_currencies');
    var s = w.value.replace(/,/g,' ').split(' ');
    for(var i of s) { if(i!='') o[i]=1; }
    if(o[e]) delete o[e]; else o[e]=1;
    w.value = Object.keys(o).join(' ');
    return false;
}

function kalatori_test(e) {
    var q = e.closest('.form-group');
    var ans = q.querySelector('#kalatori_test');
    ans.style.display = 'block';

    var i = q.querySelector('INPUT');
    var url_my = (i.value && i.value!='' ? i.value : i.placeholder);
    var url = '".Configuration::get('DOT_URL')."';
    if(url_my != url) return ans.innerHTML = 'Save first and try again';

    var ajax_url = '". $this->context->link->getModuleLink($this->name, 'ajax', [], true)."';
    ajax_url += '?endpoint=status';

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
	    var s = 'Daemon is not responsing: '+url;
	    try {
		function hh(s) { return s.replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
		var j = JSON.parse(this.responseText);
		if(!j.error) {
		    var curs = '';
		    for(var x in j.supported_currencies) curs+=' <button onclick=\"return kalatori_pin(this)\">'+hh(x)+'</button>';
    		    s = '<div style=\"color:green\">Daemon is avaliable: '+url+'</div>'
		    + '<div>currencies:'+curs+'</div>'
		    + '<div>version: '+hh(j.server_info.version)+'</div>'
		    + '<div>remark: '+hh(j.server_info.kalatori_remark)+'</div>';

		    var w = document.querySelector('#kalatori_currencies');
		    if(w.value=='') w.value = Object.keys(j.supported_currencies).join(' ');
		}
	    } catch(er){}
	    ans.innerHTML = s;
	}
    };
    xhttp.ontimeout = function() { ans.innerHTML = 'Server is not avaliable'; };
    xhttp.open('GET', ajax_url, true);
    xhttp.timeout = 1000; // Timeout set to 1 second
    xhttp.send();
}
</script>
<input type='button' value='check' onclick='kalatori_test(this)' style='color:sienna'> &nbsp; The daemon URL, default ".$this->DOT_URL_DEFAULT." if empty"
."<div id='kalatori_test' class='alert alert-info' style='display:none'></div>"
,
                        'type' => 'text',
                        'required' => false,
                    ],

                ],
                'submit' => [
                    'title' => $this->trans('Save', [], 'Admin.Actions'),
                ],
            ],
        ];

        $helper = new HelperForm();
        $helper->show_toolbar = false;
        $helper->table = $this->table;
        $lang = new Language((int) Configuration::get('PS_LANG_DEFAULT'));
        $helper->default_form_language = $lang->id;
        $helper->allow_employee_form_lang = Configuration::get('PS_BO_ALLOW_EMPLOYEE_FORM_LANG') ?: 0;
        $helper->id = (int) Tools::getValue('id_carrier');
        $helper->identifier = $this->identifier;
        $helper->submit_action = 'btnSubmit';
        $helper->currentIndex = $this->context->link->getAdminLink('AdminModules', false) . '&configure='
            . $this->name . '&tab_module=' . $this->tab . '&module_name=' . $this->name;
        $helper->token = Tools::getAdminTokenLite('AdminModules');
        $helper->tpl_vars = [
            'fields_value' => $this->getConfigFieldsValues(),
            'languages' => $this->context->controller->getLanguages(),
            'id_language' => $this->context->language->id,
        ];

        return $helper->generateForm([$fields_form]); // , $fields_form_customization]);
    }

    public function getConfigFieldsValues()
    {
        $a=array();
        foreach($this->fields_need as $l) $a[$l] = Tools::getValue($l, $this->{$l});
        return $a;
    }

    public function getTemplateVarInfos()
    {
        $cart = $this->context->cart;

        $total = sprintf(
            $this->trans('%1$s (tax incl.)', [], 'Modules.Kalatori.Shop'),
            $this->context->getCurrentLocale()->formatPrice($cart->getOrderTotal(true, Cart::BOTH), $this->context->currency->iso_code)
        );

	$amount = $cart->getOrderTotal(true, Cart::BOTH);

        $dotDaemon = $this->daemon;
        if (!$dotDaemon) {
            $dotDaemon = '___________';
        }

        $dotCustomText = Tools::nl2br(Configuration::get('DOT_CUSTOM_TEXT', $this->context->language->id));
        if (empty($dotCustomText)) {
            $dotCustomText = '';
        }

        return [
	    'module_name' => $this->name,
	    'module_host' => $this->_path . "views",
	    'ajax_url' => $this->context->link->getModuleLink($this->name, 'ajax', [], true),
	    'order_id' => $cart->id,
	    'shop_id' => $cart->shop_id,
	    'currency' => $this->context->currency->iso_code,
	    'currencies' => Configuration::get('DOT_CURRENCIES'),
	    'name' => Configuration::get('DOT_NAME'),
//	    'products' => sizeof($cart->'_products:protected'),
//	    'products' => sizeof($cart->_products),
            'total' => $total,
            'amount' => $amount,
            'dotDaemon' => $dotDaemon,
            'dotCustomText' => $dotCustomText,
        ];
    }
}
