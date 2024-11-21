<?php
/**
 * @since 1.5.0
 *
 * @property Ps_Kalatori $module
 */
class Ps_KalatoriAjaxModuleFrontController extends ModuleFrontController
{
    public $ssl = true;


    /**
     * @see FrontController::postProcess()
     */
  public function postProcess() {

    $endpoint = $_REQUEST['endpoint'];
    $url = Configuration::get('DOT_URL'); if(empty($url)) $url='http://localhost:16726';

    // S t a t u s
    if($endpoint == 'status') {
        $r = $this->ajax($url."/v2/status");
	$this->jdie($r);
    }

    if($endpoint != 'order') $this->ejdie('Unknown endpoint. Use status or order.');

    // O r d e r
    $cart = $this->context->cart;

    if( !$cart
	|| $cart->id_customer == 0
	|| $cart->id_address_delivery == 0
	|| $cart->id_address_invoice == 0
	|| !$this->module->active
    ) $this->jdie( array('redirect' => $this->context->link->getPageLink('order', true, null, 'step=1') ) );

    // Check that this payment option is still available in case the customer changed his address just before the end of the checkout process
    $authorized=false; foreach( Module::getPaymentModules() as $module ) {
        if($module['name'] == 'ps_kalatori') { $authorized=true; break; }
    } if( !$authorized ) $this->ejdie('This payment method is not available.');

    $customer = $cart->id_customer;
    $customer_obj = new Customer($customer);
    if(!Validate::isLoadedObject($customer_obj)) $this->jdie( array('redirect' => $this->context->link->getPageLink('order', true, null, 'step=1') ) );

    // Что нам известно внутри магазина
    $amount = (float) ($cart->getOrderTotal(true, Cart::BOTH));
    $order = (int) $cart->id;
    $currency0 = $this->context->currency->iso_code;

    // что нам прислали?
    $input = (array)json_decode( file_get_contents("php://input") );
    $currency = $input['currency'];

        // Проверяем, разрешен ли
        $currences = Configuration::get('DOT_CURRENCES');
        if(!empty($currences)) {
            $currences = str_replace(',',' ',$currences);
            $C = ( strpos($currences,' ')<0 ? array($currences) : explode(' ',$currences) );
            foreach($C as $n=>$c) $C[$n] = trim($c);
            if(!in_array($currency,$C)) $this->ejdie('Currency not in list');
        }
        if($currency0 != substr($currency,0,strlen($currency0))) $this->ejdie('Currency not found');

    $name = Configuration::get('DOT_NAME'); if(empty($name)) $name='PrestaShop';
    $url = Configuration::get('DOT_URL'); if(empty($url)) $url='http://localhost:16726';
    $url.="/v2/order/ps_".urlencode($name.'_'.$order);

    // A J A X
    $data = array(
	'currency' => $input['currency'],
	// 'order' => $order,
	'amount' => $amount
    );
    $r = $this->ajax($url,$data);

    // Log
    $this->logs("\n\n--------------------- ".date("Y-m-d H:i:s")." order:".$data['order']." amount:".$data['amount']." ".$data['currency']."\n".print_r($r,1));

    // Success ?
    if(isset($r['payment_status']) && strtolower($r['payment_status'])=='paid') {
	// paid success
	if( $order ) {
	    // SUCCESS
	    $mailVars = [ '{dot_daemon}' => Configuration::get('DOT_DAEMON') ];
	    $this->module->validateOrder(
		$order,
		(int) Configuration::get('PS_OS_PAYMENT'),
		$amount,
		$this->module->displayName,
		null,
		$mailVars,
		(int) $this->context->currency->id,
		false,
		$customer_obj->secure_key
	    );
        }
        $r['redirect'] = $this->context->link->getModuleLink($this->module->name, 'validation', [], true);
    }

    // Log
    $this->logs("\n\n--------------------- ".date("Y-m-d H:i:s")." order:".$data['order']." amount:".$data['amount']." ".$data['currency']."\n".print_r($r,1));

    $this->jdie($r);
  }

  function ejdie($s) { $this->jdie(array('error'=>1,'error_message'=>$s)); }
  function jdie($j) { die(json_encode($j)); }
  function ajax($url,$data=false) {
    $ch = curl_init($url);
    curl_setopt_array($ch, array(
        CURLOPT_HTTPHEADER => array('Content-Type:application/json'),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FAILONERROR => true,
        CURLOPT_CONNECTTIMEOUT => 2, // only spend 3 seconds trying to connect
        CURLOPT_TIMEOUT => 20 // 30 sec waiting for answer
    ));

    if($data) {
	curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
	curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    }
    $r = curl_exec($ch);
    if(curl_errno($ch) || empty($r)) $this->ejdie("Daemon responce empty: ".curl_error($ch));
    $r = (array) json_decode($r);
    if(empty($r)) $this->ejdie("Daemon responce error parsing");
    // Add the HTTP response code
    $r['http_code'] = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return $r;
  }

  function logs($s='') {
    // $f = DIR_LOGS . "polkadot_log.log";
//    $f='/home/WWW/shop-PrestaShop/files/payments.log';
//    $l=fopen($f,'a+');
//    fputs($l,$s."\n");
//    fclose($l);
//    chmod($f,0666);
  }

}
