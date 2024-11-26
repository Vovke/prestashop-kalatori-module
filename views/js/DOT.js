//                       _  __     _       _             _
//                      | |/ /__ _| | __ _| |_ ___  _ __(_)
//                      | ' // _` | |/ _` | __/ _ \| '__| |
//                      | . \ (_| | | (_| | || (_) | |  | |
//                      |_|\_\__,_|_|\__,_|\__\___/|_|  |_|
//
// https://alzymologist.github.io/kalatori-api/

// никакого ajax_host! эндпоинт называется ajax_url

DOT={
	debug: 0, // ТОЛЬКО ДЛЯ ОТЛАДКИ! ПОТОМ УБРАТЬ!
	noweb: 0,
	daemon: { // тут будет инфо, пришедшая от демона
},

test_acc: "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5",

// CUR: 'USD',

nodes: {},

cx: { // тут будет инфо
// СЛУЖЕБНОЕ:
    topupButton: '', // (DOT.is_test() ? '' : "💰"),

// ИЗНАЧАЛЬНОЕ:
    pay_acc: 'wait', //  целевой аккаунт, который пришлет магазин
    pay_bal: 0, // баланс на нём
    my_acc: "", // выбранный аккаунт

// ПОЯВЯЩЕЕСЯ:
//	total: 30.1 - цена
//	order: "X1123_M",
//	my_hash: будущий хэш
//	ajax_url: адрес эндпоинта

// ОБЯЗАТЕЛЬНОЕ:
//	currency: "USD",
//	currencies: "USDT-L DOT-L"

// ОПЦИОНАЛЬНОЕ:
//	daemon_direct: 0 - флаг обозначающий, напрямую ли должен DOT.js обращаться к демону,
//		если нет, то status_url=ajax_url+'?endpoint=status'; order_url=ajax_url+'?endpoint=order';
//      	если да, что status_url=ajax_url+'/v2/status'; order_url=ajax_url+'/v2/order/*';
//	status_url: можно задать отдельно
//	order_url: можно задать отдельно
//	mainjs: "https://store/plugin/view/js/" Папка, где JS-скрипты, если не установлена, считается, что они уже
//	name - store name
//	shop_id - shop id (add to order_id if exist)
},

flag: {/*
	paid: 0, // оплачен ли заказ уже
	finalized: 0, // запретить повторный запуск
	processing_payment: 0, // никаких платежей сейчас не происходит
 	success || DOT.intervalSec) return; DOT.flag.success=1; // запретить повторный запуск

	DOT.waitDaemon.stop();
	DOT.waitManual.stop();
	DOT.progress.stop();
*/},

inf: function() {
  try {
    var caller = DOT.inf.caller;
    if(caller && (caller = caller.caller)) return " {caller: "+caller.name+"()}";
  } catch(er){}
  return "";
},

reboot: function(newcur) {
    console.log("reboot(except "+newcur+")"+DOT.inf());
    for(var cur in DOT.nodes) { if(cur!=newcur && DOT.nodes[cur].api) DOT.disconnect(cur); }
    DOT.accs = [];
    DOT.flag = {};
    DOT.waitDaemon.stop();
    DOT.waitManual.stop();
    DOT.progress.stop();
},

accs: [], // тут будет инфо аккаунтов

//////////////////////////////////////////////////////////

// Фишки для дизайна Света
SV: {

    // Select an Acount
    select: async function(event) {
	event.preventDefault();
	if(event.stopPropagation) event.stopPropagation();
	if(event.stopImmediatePropagation) event.stopImmediatePropagation();
	var e = window.event.target;

	console.log("=========== select account");

	var elem = ( e.className == 'kco-account' ? e : e.closest('.kco-account') );
	var a = false; for(var x of DOT.accs) { if(x.elem === elem) { a = x; break; } }
	if(a===false) {
	    console.log("Fucking Miracle: elem not found");
	    return false; // быть такого не может
	}

	if(e.tagName=='circle') { // cpbuf
	    while(e.tagName!='svg') e=e.parentNode;
	    DOT.e = e;
	    console.log("Copy buffer: "+a.acc);
	    DOT.cpbuf(a.acc);
	    DOT.aFlash(e,0.1);
	    return;
	}

	if(e.tagName=='DIV') { // pin
	    if(!DOT.is_test()) return; // Debug feature only
	    DOT.do_button_on();
	    DOT.topUpBalance(e,a.acc);
	    return;
	}

        if(!a.active) return; // там недостаточно средств

	DOT.cx.my_acc = a.acc;
	DOT.cx.my_wallet = a.wallet;
	DOT.SV.page_Select();

	DOT.all_submit();

    },


    page_Select: function() {

	console.log("=========== SCREEN: select");

	var a = false; for(var x of DOT.accs) {
	    if(x.acc == DOT.cx.my_acc && x.wallet == DOT.cx.my_wallet) { a = x; break; }
	}

	// other: pay with this value

	DOT.SV.oneWallet(a.wallet);
	DOT.dom('sv-accounts-field').innerHTML=`
<button class="kco-button tiny tertiary" onclick="DOT.SV.drawAccountList()">
    ← Back to account list
</button>
<div id='sv-one-account'></div>
<div class="flex-row flex-start gap-small">
    <div class="sv-terms kco-tac-toggler" val="0">
        <span class="material-symbols-outlined">check_box_outline_blank</span>
        <span class="material-symbols-outlined">check_box</span>
    </div>
    <span>Agree to <u>terms and conditions</u> to continue with payment</span>
</div>
<button class="kco-button kco-tac-disabled disabled" onclick="DOT.SV.page_Signature()">
    Sign transaction in your PolkadotJS browser extension
</button>
`;
	DOT.SV.init();
	a.elem.classList.remove('active');
	a.elem.classList.remove('inactive');
	a.elem.classList.add('selected');
	DOT.dom('sv-one-account').appendChild(a.elem);
    },


    page_draw_oneacc: function(){
	DOT.dom('sv-section-payManual').style.display='none';
	if(DOT.dom('sv-notification')) return; // Может и не надо отрисовывать

	DOT.dom('sv-section-payWallet').innerHTML=`
<span class="t-title">Pay with browser wallet</span>

<div class="kco-collapse-content flex-col gap-medium">
    <div class="flex-row gap-medium">
        <div id='sv-wallets' class="flex-row gap-small">
            <!-- block -->
        </div>
    </div>

    <div class="kco-accounts">
        <div class="flex-col gap-large scroll">

	    <div id='sv-one-account'></div>

            <div class="flex-row flex-start gap-small">
                <div id="sv-terms-val" class="sv-terms kco-tac-toggler disabled" val="1">
                    <span class="material-symbols-outlined">check_box_outline_blank</span>
                    <span class="material-symbols-outlined">check_box</span>
                </div>
                <span onclick="DOT.SV.terms(0)">Agree to <u>terms and conditions</u> to continue with payment</span>
            </div>
            <div id='sv-notification' class="kco-notification" onclick="DOT.SV.page_Process()">
        	<!-- message -->
            </div>
        </div>

    </div>
</div>`;

	DOT.SV.init();
	DOT.html_wallets();
	var a = false; for(var x of DOT.accs) { if(x.acc == DOT.cx.my_acc) { a = x; break; } }
	if(a) {
	    console.log('a: '+a.wallet+'/'+a.acc+'/'+a.name);

	    DOT.SV.oneWallet(a.wallet,'one');
	    a.elem.classList.remove('active');
	    a.elem.classList.remove('inactive');
	    a.elem.classList.add('selected');
	    DOT.dom('sv-one-account').appendChild(a.elem);
	} else console.log('notf: '+DOT.cx.my_acc);
    },


    page_Signature: function() {
	console.log("=========== SCREEN: Signature");
	DOT.SV.page_draw_oneacc();
	DOT.dom('sv-notification').innerHTML = `<span>Waiting for your Signature from <span class='cx-my_wallet'></span> browser extension</span><span class="material-symbols-outlined ani-spin">autorenew</span>`;
	DOT.all_submit();
    },

    page_Process: function() { console.log("=========== SCREEN: Process");
	DOT.SV.page_draw_oneacc();
	DOT.dom('sv-notification').innerHTML = `<span>Transaction</u> is signed. Waiting for transaction <u>block</u></span><span class="material-symbols-outlined ani-spin">autorenew</span>`;
    },

    page_InBlock: function() { console.log("=========== SCREEN: InBlock");
	DOT.SV.page_draw_oneacc();
	DOT.dom('sv-notification').innerHTML = `<span><u>Transaction</u> block is ready. Waiting for transaction <u>finalized</u></span><span class="material-symbols-outlined ani-spin">autorenew</span>`;
    },

    page_IsFinalized: function(info) { console.log("=========== SCREEN: IsFinalized ("+info+")");
	if(DOT.flag.finalized || DOT.intervalSec) return; DOT.flag.finalized=1; // запретить повторный запуск
	DOT.SV.page_draw_oneacc();
	DOT.dom('sv-notification').innerHTML = `<span><u>Transaction</u> is completes. Waiting for daemon</span><span class="material-symbols-outlined ani-spin">autorenew</span>`;
	DOT.waitDaemon.start();
    },

    page_Success: function(url) { console.log("=========== SCREEN: Success");

	if(DOT.flag.success || DOT.intervalSec) return; DOT.flag.success=1; // запретить повторный запуск

	DOT.waitDaemon.stop();
	DOT.waitManual.stop();
	DOT.progress.stop();
	DOT.flag.processing_payment = 0;

	DOT.SV.page_draw_oneacc();
	DOT.dom('sv-notification').innerHTML = `<span><u>Payment</u> successful</span><span class="material-symbols-outlined">task_alt</span>`;

	var sec = 5;
	var e = DOT.dom('sv-second-counter');
	e.innerHTML = sec;
	DOT.dom('sv-redirect-button').style.display='block';

	DOT.intervalSec = setInterval(function(){
	    if(--sec >= 0) e.innerHTML = sec;
	    else {
		clearInterval(DOT.intervalSec); DOT.intervalSec = false;
		DOT.dom('sv-redirect-button').style.display='none';
		if(url) window.location = url;
	    }
	},1000);
    },

    drawAccountList: function() {
	DOT.dom('sv-accounts-field').innerHTML=`
<div id='sv-accounts-active' class="flex-col gap-medium">
    <!-- active -->
</div>
<div id='sv-info' class="t-small t-secondary">
</div>
<span class="t-small t-secondary">
    A balance of <span class='cx-total_min'>   </span> <span class='cx-symbol'>   </span> will be sufficient to cover both your order and the transaction fee on the Polkadot network
</span>
<div class="kco-collapsable flex-col gap-medium">
    <div class="kco-collapse-toggler flex-row">
        <span class="material-symbols-outlined">chevron_right</span>
        <span class="t-title-small">Accounts below <span class='cx-total_min'>   </span> <span class='cx-symbol'>   </span></span>
    </div>

    <div id='sv-accounts-inactive' class="kco-collapse-content flex-col gap-medium">
        <!-- inactive -->
    </div>
</div>`;

	DOT.SV.init();
	DOT.re_balance();
        DOT.SV.oneWallet();
    },

    topup: async function(e) { var e = window.event.target;
	if(!DOT.is_test()) return; // Debug feature only
	DOT.do_button_on();
	e.innerHTML=DOT.ajaximg();
	await DOT.topUpPay();
	e.innerHTML=DOT.cx.topupButton;
    },

    // Copy pay_acc to buffer + some effects
    cpbufACC: function() { var e = window.event.target;
	if(!DOT.cx.pay_acc) return;
	DOT.cpbuf(DOT.cx.pay_acc);
	var w=DOT.dom('sv-toggle-manual-field').querySelectorAll(".t-account-address")[0];
	DOT.aFlash(w,0.02);
        DOT.a360(e,0.3);
    },

    // Hightlihgt only one wallet (or all wallet if undefined)
    oneWallet: function(wallet,mode) {
	var ee = DOT.dom('sv-wallets').querySelectorAll('.kco-label').forEach(e=>{
	    if(mode=='one' && e.innerHTML!=wallet) e.style.display='none';
	    else e.classList[(!wallet || e.innerHTML==wallet?'remove':'add')]('disabled');
	});
    },

    init: function(id,html) {

        var w=DOT.dom('polkadot_work');

        for(var i in DOT.cx) { w.querySelectorAll(".cx-"+i).forEach(e=>{
	    if(i=='topupButton') e.innerHTML = DOT.cx[i];
	    else e.innerHTML = DOT.h( DOT.cx[i]===undefined ? '': DOT.cx[i] );
	}); }
	w.querySelectorAll(".cx-symbol").forEach(e=>{ e.innerHTML = (DOT.CUR===undefined?'':DOT.CUR); });
        for(var i in DOT.nodes[DOT.CUR]) { w.querySelectorAll(".cx-"+i).forEach(e=>{ e.innerHTML = DOT.h( DOT.nodes[DOT.CUR][i]===undefined ? '':DOT.nodes[DOT.CUR][i] ); }); }

	// collapse and exapnd sections
        document.querySelectorAll('.kco-collapse-toggler').forEach(e=>{
	    e.onclick = function(ev) {
		this.parentElement.classList.toggle('collapsed');
	    };
	});

	// accept terms and conditions and show manual payment address
	document.querySelectorAll('.kco-tac-toggler:not(.disabled)').forEach(e=>{
	    e.onclick = async function() {
		var newval = (1*this.getAttribute('val')?'0':'1');
		this.setAttribute('val', newval );
    		document.querySelector('.kco-manual-address-field').classList.toggle('blured');
    		var w=document.querySelector('.kco-tac-disabled'); if(w) w.classList.toggle('disabled');
    		document.querySelector('body').classList.toggle('kco-tac-accepted');
// console.log('newval='+newval);
		if(this.classList.contains('sv-terms')) {
		    document.querySelectorAll('.sv-terms').forEach(e=>{ e.setAttribute('val',newval); });
		    DOT.onterms(newval);
		}

		// Получить payment_account
		if(DOT.cx.pay_acc.length<10 && newval=='1') {
		    var json = DOT.ajax_daemon('init'); // сделать Ajax-запрос к демону
		    if(json) {
			DOT.cx.pay_acc = json.payment_account;
			document.querySelectorAll('.cx-pay_acc').forEach(e=>{e.innerHTML=DOT.cx.pay_acc});
		    }
		}

	    };
	});

	// QR modal
	var qrBtn = document.querySelector('.show-qr-btn');
	var qrModal = document.querySelector('.kco-qr-modal');
	qrBtn.onclick = function(e) {
	    if(!DOT.cx.pay_acc) return;
	    DOT.dom('sv-QR').src='https://api.qrserver.com/v1/create-qr-code/?data='+DOT.cx.pay_acc;
	    qrModal.classList.add('opened');
	};
	qrModal.onclick = function(e) { qrModal.classList.remove('opened'); };
    },

},


re_wallet: async function() {
    DOT.accs=[];
    var w=DOT.dom('sv-accounts-active'); if(w) w.innerHTML = '';
    var w=DOT.dom('sv-accounts-inactive'); if(w) w.innerHTML = '';
    DOT.init();
},



re_balance: function(bal,acc) {

    var minBalance = ( DOT.nodes[DOT.CUR] ? DOT.nodes[DOT.CUR].total_min_planks : 0);

    var w=DOT.dom('sv-accounts-active');
    if(!w) return;

    for(var a of DOT.accs) {
	if(bal!=undefined && acc && acc == a.acc) a.balance = bal;
    }

    var m = DOT.accs.filter(x => x.balance >= minBalance);

	m.sort((b,a) => a.balance - b.balance);
	m.forEach(e => {
	    e.active = true;
	    e.elem.remove(); w.appendChild(e.elem);
	    e.elem.classList.remove('selected');
	    e.elem.classList.remove('inactive');
	    e.elem.classList.add('active');
	});

    var m = DOT.accs.filter(x => x.balance === false || x.balance < minBalance);
    var w=DOT.dom('sv-accounts-inactive');
        m.sort((b,a) => a.balance - b.balance);
	m.forEach(e => {
	    e.active = false;
	    e.elem.remove(); w.appendChild(e.elem);
	    e.elem.classList.remove('selected');
	    e.elem.classList.remove('active');
	    e.elem.classList.add('inactive');
	});

},

design: async function(tmpl) {

    await DOT.LOADS_promice([
        'https://rsms.me/inter/inter.css',
        'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&.css',
    ],1,0);

    DOT.dom('polkadot_work').innerHTML = "<style>"+DOT.css+"</style>"+DOT.template;

    if(DOT.CUR) DOT.dom('sv-USDC').innerHTML = DOT.CUR;
    else if(DOT.cx.currency) DOT.dom('sv-USDC').innerHTML = DOT.cx.currency;

    document.querySelectorAll('.t-tertiary').forEach(e=>{ e.style.display='none'; });

    DOT.SV.drawAccountList();

    await DOT.init('no');

    // сперва менюшечки
    var s="<select onchange=\"DOT.CUR=this.value; DOT.f_save('kalatori_CUR',DOT.CUR); DOT.reboot(DOT.CUR);DOT.design();\">\n";
    var f = DOT.f_read('kalatori_CUR');
    Object.keys(DOT.nodes).forEach(v => {s+="<option value='"+v+"'"+(v==DOT.CUR
        || v == f ?" selected":'')+">"+v+"</option>\n";});
    s+="</select>";
    DOT.dom('sv-CUR').innerHTML = s;

    DOT.SV.init();

    DOT.initb();
},


//////////////////////////////////////////////////////////
solidus_init: function(cx) {
	DOT.store = 'solidus';
	DOT.cx=cx;
	DOT.health_url = "/kalatori/blockchain_status";
	DOT.cx.ajax_url = "/kalatori/address/check";

	DOT.ajax_headers = { "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').getAttribute('content') };

	DOT.button_on=function(){
	    document.getElementById('modal_submit').style.display='block';
	};
	DOT.button_off=function(){
	    document.getElementById('modal_submit').style.display='none';
	};

	DOT.onpaid=function() {
	    document.getElementById('checkout_form_confirm').submit();
	}
	DOT.init();
},

//////////////////////////////////////////////////////////

magento_init: function(cx) {
    if(cx) DOT.cx = {...DOT.cx, ...cx};

    DOT.store = 'magento';

    DOT.button_on=function(){
	    jQuery('body').trigger('processStop');
	    DOT.cx.magento_this.isPlaceOrderActionAllowed(true);
    };
    DOT.button_off=function(){
	    jQuery('body').trigger('processStart');
	    DOT.cx.magento_this.isPlaceOrderActionAllowed(false);
    };

    var p = window.checkoutConfig.payment.kalatorimax;
    if(!p) DOT.error('magento system error #0104');
    DOT.cx.currencies = p.currencies;
    DOT.cx.mainjs = p.assets_base_url+"/"; // "https://magento.zymologia.fi/static/version1709653373/frontend/Magento/luma/en_US/Alzymologist_KalatoriMax/js"
    DOT.cx.ajax_url = p.store_base_url+"alzymologist/payment/index"; // 'https://magento.zymologia.fi/alzymologist/payment/index'; // window.checkoutConfig.staticBaseUrl
    // DOT.health_url = DOT.cx.ajax_url+"?health=1";

    DOT.onpaid=function() {
	DOT.do_button_on();
        DOT.cx.magento_this.getPlaceOrderDeferredObject().done(
                function () {
                    DOT.cx.magento_this.afterPlaceOrder();
                    if(DOT.cx.magento_this.redirectAfterPlaceOrder) {
                            DOT.cx.redirectOnSuccessAction.execute();
                    }
                }
        );
    };

    DOT.design();
},

opencart3_init: function(cx) {
    DOT.store = 'opencart3';
    DOT.button_on=function(){ $('#button-confirm').button('reset'); };
    DOT.button_off=function(){ $('#button-confirm').button('loading'); };

    DOT.class_warning=cx.class_warning;
    DOT.class_error='';
    DOT.class_ok=cx.class_ok;

    cx.mainjs=cx.wpath+"catalog/view/javascript/polkadot/";

    DOT.cx = {...DOT.cx,...cx};
    DOT.design();
},

opencart3_submit: function() {
    // Array.from(DOT.dom('form-polkadot').elements).forEach((e) => { const { name,value } = e; DOT.cx[name]=value; });
    return DOT.all_submit();
},

onterms: function(x) {},

// ============ P R E S T A  S H O P ===============

presta_start: function(e) {

    console.debug('presta_start()');

    e=e.closest("DIV.payment-options");
    if(!e) return DOT.error('design error 01');
    e=e.querySelector("INPUT[name='payment-option']"); // .click(); // [id*='payment-option-']
    if(!e) return DOT.error('design error 02');
    // e.style.border='10px solid red';
    e.click();

    // checkbox terms
//    DOT.onterms = function(x) { //  блять согласен - поставить checkbox (ТОЛЬКО ДЛЯ ОТЛАДКИ!!!)



//	DOT.dom("conditions_to_approve[terms-and-conditions]").classList.add('sv-terms');

// name="conditions_to_approve[terms-and-conditions]" required="" type="checkbox" value="1" class="ps-shown-by-js">
//      document.querySelectorAll("INPUT[type='checkbox'][name*='conditions_to_approve']")
//	.forEach(e=>{
//	    e.classList.add('sv-terms');
        // e.parentNode.style.border='1px dotted red';
        // e.setAttribute('checked',x?true:false);
//      });
//    }

},

presta_init: function(cx) {
    // запускается во время общей загрузки страницы, но выбор плагина DOT еще не сделан!
    DOT.store = 'presta';

    cx.total = cx.amount;
    cx.mainjs = cx.wpath+'/js/';
    DOT.cx = {...DOT.cx,...cx};

    // определяем процедуру включения основной платежной кнопки
    DOT.button_oon=function() {
	DOT.dom('payment-confirmation').querySelectorAll("BUTTON[type='submit'].disabled").forEach(function(e){
	    e.classList.remove("disabled");
	    e.disabled=null;
	});
    };

    // И выключения
    DOT.button_ooff=function() {
	DOT.dom('payment-confirmation').querySelectorAll("BUTTON[type='submit']").forEach(function(e){
	    e.classList.add("disabled");
	    e.disabled=true;
	});
    };

    // перехатываем только нашу FORM.onsubmit
    var e=document.querySelector('FORM[action*="'+cx.module_name+'"]');
    if(!e) return DOT.error("Prestashop DOT plugin: Design error!");
    e.onsubmit=function(x) { DOT.all_submit(); return false; };

    DOT.onterms=function(x) {
	var w=DOT.dom("conditions_to_approve[terms-and-conditions]");
	console.log('Terms: '+x+' ~ '+w.getAttribute('checked'));
	if(1*w.checked != 1*x) w.click();
    };


/*
    // debug option
    if(DOT.debug) { // да блять согласен - поставить checkbox (ТОЛЬКО ДЛЯ ОТЛАДКИ!!!)
      document.querySelectorAll("INPUT[type='checkbox'][name*='conditions_to_approve']").forEach(function(e){
        e.parentNode.style.border='1px dotted red';
        e.setAttribute('checked',true);
      });
    }
*/

    // 1. навешиваем на каждый выбор платежной опции запоминание этой опции
    //    с функцией старта наших процедур, если выбран наш плагин
    document.querySelectorAll('DIV[id^="payment-option-"]').forEach(function(q){
        if(q.id.indexOf('-container')<0) return;
        q.onclick=function(e) { var x=this;
            if(x.tagName!='DIV'||x.id.indexOf('-container')<0) x=x.closest('DIV[id^="payment-option-"]'); if(!x) return;
            DOT.f_save('pay_select',x.id);
	    // а не наш ли это был выбран плагин?
	    if(x.querySelectorAll("IMG[src*='polkadot.webp']").length) { // да, наш!
		DOT.button_ooff();
		DOT.design();
	    } else {
		DOT.button_oon();
	    }
        };
    });

    // 2. смотрим, какую платежную опцию выбирали в этом магазине прежде, делаем автовыбор
    var ps = DOT.f_read("pay_select");
    if(!ps) ps=''; else ps=''+ps;
    var p=document.getElementById(ps);
    if(p) { // если такая опция была, то сразу кликнуть нужный способ оплаты
	p=p.querySelector("INPUT#"+ps.replace(/\-container/g,''));
	if(p.focus) p.focus(); if(p.click) p.click();
    } else { // если опции не нашлось на странице
	// то какой-то вообще элемент выбран?
      document.querySelectorAll('DIV[id^="payment-option-"]').forEach(function(q){
        if(q.id.indexOf('-container')<0) return;
	if(q.querySelectorAll("IMG[src*='polkadot.webp']").length) { // если это наш, кликнуть
	    var inp = q.querySelector("INPUT[name='payment-option'");
	    if(inp && inp.checked) setTimeout(function(e){ q.click(); },100); // и если он выбран
	}
      });
    }
},

//====================================================================================================

    path: false,

    button_on: function(){},
    button_off: function(){},
    // flag.processing_payment: 0, // никаких платежей сейчас не происходит
    do_button_on: function(){ DOT.flag.processing_payment=0; DOT.button_on(); },
    do_button_off: function(){ DOT.flag.processing_payment=1; DOT.button_off(); },

//    ajax_headers: {}, // хедеры, подставляемые в платежный запрос аякса

    class_warning: 'alert alert-danger',

    h: function(s){
        return (''+s).replace(/\&/g,'&'+'amp;').replace(/\</g,'&'+'lt;').replace(/\>/g,'&'+'gt;').replace(/\'/g,'&'+'#039;').replace(/\"/g,'&'+'#034;'); // '
    },

    dom: function(e) { return (typeof(e)=='object' ? e : document.getElementById(e) ); },

    // alert - пишет в 'dotpay_console'
    // срабатывает всегда
    'alert': function(s){
	if(s!=='clear') console.log("DOM.alert( "+s+" )");
	if(DOT.noweb) return;
	var w=DOT.dom('dotpay_console');
	if(!w) return;
	if(s=='clear') { w.innerHTML=''; w.style.display='none'; }
	else { w.innerHTML+=s+'<br>';  w.style.display='block'; }
    },

    // error - сообщение о серьезной ошибке
    error: function(s,info) { if(!info) info=DOT.inf();
	// DOT.reboot(); // сбросить все флаги и прочее
        DOT.do_button_on();
	DOT.win_alert(// 'DOT.error("'+info+'"):\n\n'+
s);
	return false;
    },

    // Выдать окно с алертом ( пока alert() ) и запретить на это время уходы со страницы
    win_alert: function(s) {
	DOT.erralert=true;
	console.log(s);
	if(!DOT.noweb) alert(s);
	DOT.erralert=false;
    },

    before_redirect: function(url) {
	DOT.SV.page_Success(url); // Before redirect
	return false;
	// alert("Payment success!\nRedirect?\n\n" + DOT.h(url) );
	// return true;
    },

    redirect: function(url) {
	if(DOT.erralert===true) DOT.win_alert('Redirect blocked: '+url);
	else {
	    console.debug("[ !!!! ] REDIRECT: "+url);
	    if( DOT.before_redirect(url) ) window.location = url;
	    return false;
	}
	return false;
    },

    // Talert - варнинги и отладочные данные
    // пишет в 'dotpay_console_test', созданной внутри 'dotpay_console' (нахера так сложно?)
    // срабатывает только при DOT.dubug=1 или при 2 аргументе: Talert( ... ,1)
    Talert: function(s,deb) {
	if(s!=='clear') console.log(s);
	if(DOT.noweb) return;
	if(!deb && !DOT.debug) return;

	var w=DOT.dom('dotpay_console_test');
	if(!w) {
	    if(s=='clear') return; // если пусто, то ли не создавать
	    DOT.alert("<div class='"+DOT.class_warning+"' id='dotpay_console_test'></div>");
	    w=DOT.dom('dotpay_console_test');
	    if(!w) return DOT.win_alert('Kalatori error: '+s );
	}
	if(s=='clear') w.innerHTML='';
	else if(deb || DOT.debug) w.innerHTML+=s+'<br>';
	w.style.display=(w.innerHTML==''?'none':'block');
    },

    f_save: function(k,v){ try { return window.localStorage.setItem(k,v); } catch(e) { return ''; } },
    f_read: function(k){ try { return window.localStorage.getItem(k); } catch(e) { return ''; }},
    f_del: function(k){ try { return window.localStorage.removeItem(k); } catch(e) { return ''; }},

// ============== presta ==============
add_ah: function(a,CUR) { // добавляем в запрос ещё кое-какие нужные параметры, если assethub
    if(DOT.nodes[CUR].asset_id) {
	a.tip = ( DOT.nodes[CUR].tip ? DOT.nodes[CUR].tip : 0 ); // 0 или приказываю дать татарам мзды за срочность транзации
	a.assetId = DOT.nodes[CUR].asset_id; // сука, да как ты вообще раньше без этого работало?!
    }
    return a;
},

noN: function(CUR){ return DOT.error("Currency not found: ["+CUR+"]"); },
intHuman: function(x){ return 1*(''+x).replace(',',''); },

chain_info: async function(CUR) {

    console.log("chain_info");

    // соединение с блокчейном
    if( ! (await DOT.connect(CUR)) ) {
	console.log("chain_info: can't connect to "+CUR);
	return false;
    }

    var N=DOT.nodes[CUR];
    if(!N) return DOT.noN(CUR);

    var x, decimals, symbol;
    if( N.asset_id ) {

	// это ASSETHUB!!!

	if(!N.decimals) { // Так-то мы это получаем с демона, но не надо забывать, что этой же процедурой пользуется и сам демон при старте
	    try { // decimals, name, symbol
		x = await N.api.query.assets.metadata(N.asset_id);
		x = x.toHuman();
		N.x = x; // Debug purpouse
		decimals = DOT.intHuman(x.decimals); // 6
		N.name = x.name; // "USD Coin"
		symbol = x.symbol; // "USDC"
	    } catch(e){}
	}

	if(!N.deposit) {
	    try { // deposit
		x = await N.api.query.assets.asset(N.asset_id);
		N.x2 = x.toHuman(); // Debug purpouse
		N.deposit = DOT.intHuman(x.toHuman().minBalance);
	    } catch(e){}
	}

	if(!N.ss58) N.ss58 = 0; // joko paiva?

	N.fee = 0.04;
	N.fee_planks = N.fee * (10**N.decimals);

        // if(!N.fee_planks) N.fee_planks = 0.04; // (10**N.decimals)*0.1; // Ну например так

    } else {

	// это не asset, нормальный блокчейн!!!

	if(!N.decimals || !N.ss58) { // только разве что ss58 узнать, остальное знаем уже
	    try { // decimals, name, symbol
		x = await N.api.rpc.system.properties();
		x = x.toHuman();
		decimals = DOT.intHuman(x.tokenDecimals[0]);
		symbol = x.tokenSymbol[0];
		N.ss58 = 1*(x.ss58Format); // если null, то и будет 0
	    } catch(e){}
	}

	if(!N.deposit) {
	    try { // deposit
		N.deposit = DOT.intHuman( await N.api.consts.balances.existentialDeposit );
	    } catch(e){}
	}

    }

    // проверочки
    if(decimals && decimals != N.decimals) return DOT.error("Mismatch decimals: ["+N.decimals+"] != ["+decimals+"]");

    if(symbol && symbol != CUR
	    && symbol != CUR.substring(0,symbol.length) // ну хоть первые буквы пусть совпадают?
    ) return DOT.error("Mismatch symbol: ["+symbol+"] != ["+CUR.substring(0,symbol.length)+"] ("+CUR+")");

    if(!N.deposit) return DOT.error("Unknown ED (Existential Deposit)");

    if(DOT.cx.total) {
	N.total_planks = DOT.cx.total * (10 ** N.decimals);
	N.total_planks = Math.ceil(N.total_planks); // 131199999.99999999 ах ты ж сука блять
	if(!N.total_planks) return DOT.error("Unknown total");
    }

    // выясним цену транзакции для НАШЕЙ КОНКРЕТНОЙ ЦЕНЫ
    if(!N.fee && !N.fee_planks) {
        var example_acc = ( (''+DOT.cx.pay_acc).length > 10 ? DOT.cx.pay_acc : DOT.test_acc );
	var example_amount = (N.total_planks ? N.total_planks : 10**(N.decimals+2) ); // Total или сотня в местной валюте
        N.x3 = await DOT.Transfer(example_acc, example_amount, CUR).paymentInfo(example_acc,DOT.add_ah({},CUR));
        // const { partialFee }
        N.fee_planks = 1*(N.x3.partialFee.toNumber());
        if(!N.fee_planks) return DOT.error("Unknown fee");
    }

    if(DOT.cx.total) {

        N.total_add_planks = N.fee_planks + N.deposit;
        N.total_min_planks = N.total_planks + N.fee_planks + N.deposit;

        N.total_add = DOT.indot( N.fee_planks + N.deposit, "00X");
        N.total_min = DOT.indot( N.total_planks + N.fee_planks + N.deposit, "00X");
	N.fee = DOT.indot( N.fee_planks, "0000X");
    }

},

daemon_get_info: async function() {

    if(!DOT.CUR && DOT.cx.currency) DOT.CUR = DOT.cx.currency; // USD
    if(DOT.CUR) DOT.CUR = DOT.CUR.toUpperCase();

    if(DOT.cx.daemon_direct) {
	if(!DOT.cx.status_url) DOT.cx.status_url = DOT.cx.ajax_url+'/v2/status';
	if(!DOT.cx.order_url) DOT.cx.order_url = DOT.cx.ajax_url+'/v2/order/*';
    } else {
	if(!DOT.cx.status_url) DOT.cx.status_url = DOT.cx.ajax_url+(DOT.cx.ajax_url.indexOf('?')<0?'?':'&')+'endpoint=status';
	if(!DOT.cx.order_url) DOT.cx.order_url = DOT.cx.ajax_url+(DOT.cx.ajax_url.indexOf('?')<0?'?':'&')+'endpoint=order&currency=@';
    }

    // Взяли список блокчейнов
    // Setup enpoints
    // DOT.health_url = DOT.cx.ajax_url+'/v2/health'; // нахуй не нужен так-то

    // Get currencies /status
    console.log("Get currencies /status = "+DOT.cx.status_url);
    try {
	var j = DOT.AJAX( DOT.cx.status_url );
	if(j.error) DOT.huemoe();
    } catch(er) {
	return DOT.error("Can't connect daemon: "+DOT.cx.status_url);
    }

    try {
        if(!j.supported_currencies || 0==Object.keys(j).length) return DOT.error("/status: No currencies");

        if(DOT.cx.currencies) { // Оставим только разрешенные
	    // возможные:
	    var m1 = Object.keys(j.supported_currencies);
	    // разрешенные:
	    var m2 = DOT.cx.currencies.replace(/,/g,' ').split(' ');
	    // 	подходящие из разрешенных (найти аналоги для USD или EUR типа USDC):
            for(var i in m2) { var x=m2[i]; if(x.substring(0,DOT.cx.currency.length)!=DOT.cx.currency) delete m2[i]; }
	    // удаляемые
	    var del = m1.filter(x => !m2.includes(x));
	    del.forEach(x=>delete(j.supported_currencies[x]));

	    if(0==Object.keys(j.supported_currencies).length) { // Нет разрешенных!
		return DOT.error("Currency "+DOT.cx.currency+" not allowed");
	    }

    	    DOT.nodes=j.supported_currencies;

	    if(!DOT.nodes[DOT.CUR]) { // ну тогда выбрать тот, что был сохранен
		DOT.CUR = DOT.f_read('kalatori_CUR');
	    }

	    if(!DOT.nodes[DOT.CUR]) { // ну тогда выбрать первый попавшийся
    		for(var x in DOT.nodes) { DOT.CUR=x; break; }
	    }

        }

    } catch(er) { return DOT.error("/status: "+er); }


    // Выяснили, какой у нас блокчейн
    console.log('DOT.CUR: '+DOT.CUR);
    var N = DOT.nodes[DOT.CUR];
    if(!N) return DOT.noN(DOT.CUR);

    // Уже опрашивали этот блокчейн? По второму разу не будем, пожалуй.
    if(!N.total_planks) {
        // Опрос блокчейна
        await DOT.chain_info(DOT.CUR);
        // Вот йобаная проверка на недостаточную цену
    } else {
	if(!N.api) await DOT.connect(DOT.CUR);
    }

    if(N.total_planks <= N.fee_planks + N.deposit) return DOT.error("Error: Total can be more than "+DOT.indot( N.fee_planks + N.deposit, "0000X")+" (Deposit+Fee)");

    return true;
},


indot: function(x,fmt) { // fmt: '00x' - два символа после запятой и округлить в меньшую

    var c=10000,round='round',X;
    if(fmt && fmt.length) {
	round=fmt.replace(/\d+/g,'');
	    if(round=='x') round='floor'; // округлять в меньшую
	    else if(round=='X') round='ceil'; // округлять в большую
	c=fmt.replace(/[^\d]+/g,'').length;
	if(!c) c=2;
	c=10**c;
    }

    var N = DOT.nodes[DOT.CUR];

    X=Math[round]( parseInt(x)/(10 ** N.decimals)*c ) / c;
    if(fmt === undefined) X+=" "+N.symbol;
    if(fmt === 1) X+=" ("+x+" planks)";
    return X;
},

ajax_process_errors: function(json) {
    if(json.error) {

        if(json.error.warning) DOT.Talert('warning: '+json.error.warning);

        if(typeof(json['error'])=='object') {
            for (i in json.error) DOT.Talert('error: '+i+' = '+json.error[i],1);
        } else {
            DOT.Talert('error: '+json.error +(json.error_message ? ' '+json.error_message : ''),1 );
        }

	return DOT.error('error: '+JSON.stringify(json) );
    }

    return json;
},


ajax_daemon: function(info) {
    var N=DOT.nodes[DOT.CUR];
    console.debug('ajax_daemon('+info+')');
    if(!DOT.cx.total || !N.total_planks) return DOT.error('DOT plugin error 0801: empty total');

    if(!DOT.cx.order_url) return DOT.error('order_url not set'); // напрямую с демоном

    var data = {
	order: (DOT.cx.shop_id?DOT.cx.shop_id+'_':'')+DOT.cx.order_id,
	currency: DOT.CUR,
	amount: DOT.cx.total,
    };
    if(DOT.destination) data.destination = DOT.destination;
    if(DOT.ondata) data=DOT.ondata(data); // Если нужен обработчик

    data = JSON.stringify(data);
    var url = DOT.cx.order_url.replace('*',DOT.cx.order_id); // /v2/order/*
    var url = DOT.cx.order_url.replace('@',DOT.CUR); // /v2/order/*

    if( DOT.flag.end ) return false;
    var j = DOT.AJAX( url, data, DOT.ajax_headers );
    if( DOT.flag.end ) return false;
    var json = DOT.ajax_process_errors(j);
    if(!json) {
	console.debug('ajax_daemon[!]: error');
	return false;
    }
    json.ans = (''+json.payment_status).toLowerCase(); // (pending, paid)
    DOT.json = json;
    console.debug('ajax_daemon ans = '+json.ans);
    if(DOT.onjson) json=DOT.onjson(json);
    if(json.ans =='pending' || json.ans == 'paid') return json;
    return DOT.error('ERROR OPT:\n\n '+JSON.stringify(json));
},

waitManual: {
    id: false,
    stop: function() {
	console.log("waitManual.stop()");
	if(DOT.waitManual.id!==false) { clearInterval(DOT.waitManual.id); DOT.waitManual.id = false; }
    },
    start: function(info) {
	console.log("waitManual.start("+info+")");
        if(DOT.waitManual.id!==false) return; // уже запущено
	DOT.waitManual.id = setInterval(
	    async function(){ // опрос демона

		if( DOT.flag.end ) return DOT.waitManual.stop();

		if(    !DOT.cx.pay_acc
		    || !DOT.cx.my_acc
		    || !DOT.api
		) {
		    // console.log("waitManual");
		    return; // если нету платежного аккаунта или не выбран свой
		}
		// console.log("waitManual!");
		var json = DOT.ajax_daemon('waitManual'); // сделать Ajax-запрос к демону
		if(json && json.ans == 'paid' ) {
		    DOT.flag.end = 1; // Всё, закончили
		    console.debug("[!] waitManual: paid!");
		    DOT.onpaid(json,'waitManual');
		}
	    },
	4000);
    },
},

// Думаем, что платеж завершен: тогда запустить ожидание демона
waitDaemon: {
    id: false,
    stop: function() {
	console.log("waitDaemon.stop()");
	if(DOT.waitDaemon.id!==false) {
	    clearInterval(DOT.waitDaemon.id); DOT.waitDaemon.id = false;
	    DOT.progress.stop();
	}
    },
    start: async function(info) {
	console.log("waitDaemon.start("+info+")");
        if(DOT.waitDaemon.id!==false && DOT.progress.id) return; // уже запущено
	DOT.waitDaemon.stop();
	DOT.waitDaemon.id = setInterval(
	    async function(){ // опрос демона

		if( DOT.flag.end ) return DOT.waitDaemon.stop();

		var json = DOT.ajax_daemon('waitDaemonInterval'); // сделать Ajax-запрос к демону
		if(json && json.ans == 'paid' ) {
		    DOT.flag.end = 1; // Всё, закончили
		    console.debug("[!] waitDaemon: paid!");
		    DOT.onpaid(json,'waitDaemon');
		}
	    },
	3000);

	// start progressbar if not yet
	DOT.progress.run(0,
    	    function(){
		DOT.error('Error: timeout');
		DOT.waitDaemon.stop();
	    }
	);

	// DOT.SV.page_IsFinalized();

    },
},

all_submit: function(y) {
    console.debug('all_submit('+(y===undefined?'':y)+')');
    if(!y) {
	if(!DOT.cx.my_acc) return DOT.error('Account not selected, return');
	DOT.Talert('clear');
	DOT.alert('clear');
    }

    DOT.do_button_off();

    var json = DOT.ajax_daemon('all_submit'); // сделать Ajax-запрос к демону
    if(json === false) return false;

    // Paid
    if( json.ans == 'paid' ) {
        DOT.flag.end = 1; // Всё, закончили
	console.debug("[ !!!! ] paid!");
	DOT.onpaid(json,'all_submit');
	return true;
    }

    // Waiting
    if( json.ans == 'pending') {
	if( json.payment_account && 1*json.amount ) DOT.setPayAccount(json.payment_account);
	console.debug('[#] Waiting for payment: '+DOT.cx.pay_acc );
	if(DOT.flag.paid) {
	    console.log("Transfer already done!");
	    return false;
	}
	console.log("Transfer "+DOT.indot( DOT.nodes[DOT.CUR].total_planks, 1)+"\nFrom: "+DOT.cx.my_acc+"\nTo: "+DOT.cx.pay_acc);
	DOT.payWithPolkadot(DOT.cx.my_acc, DOT.nodes[DOT.CUR].total_planks, DOT.cx.pay_acc);
	return true;
    }

    return false;
  },


progress: {
    total: 30000,
    now: 0,
    timeout: 100,
    id: 0,
    fn: function(){},
    run: function(x, fn) {
	    if( DOT.flag.end ) return DOT.progress.stop();

	    if(x===0) { DOT.progress.now=0; DOT.progress.fn=function(){}; }
	    if(fn) DOT.progress.fn=fn;

    if(DOT.dom('dotpay_progress_info')) DOT.dom('dotpay_progress_info').innerHTML=1*DOT.progress.now+' '+1*DOT.progress.timeout;

	    if(x!=undefined && !DOT.progress.id) {
		DOT.progress.id=setInterval(DOT.progress.run,DOT.progress.timeout);
	    }

	    DOT.progress.now += DOT.progress.timeout;

	    if(DOT.progress.now >= DOT.progress.total) {
		    clearInterval(DOT.progress.id); DOT.progress.id=false;
		    return DOT.progress.fn();
	    }

	    var prc=(Math.floor(100*DOT.progress.now/DOT.progress.total));

	    // if(prc > 10) return DOT.progress.stop;

	    if(!DOT.dom('dotpay_progress')) {
		var d = document.createElement("div");
		d.id = 'dotpay_progress';
		d.style.position = 'fixed';
		d.style.left = '0px';
		d.style.bottom = '0px';
		d.style.padding = '0px 2px 1px 2px';
		d.style.width = '100%';
		d.style.height = '20px';
		d.style.zIndex = '99999';
		document.body.appendChild(d);
	    }

	    DOT.dom('dotpay_progress').innerHTML=
		"<div style='text-align: -moz-right;width:100%;height:100%;border:1px solid #666;background:linear-gradient(to right, green 0%, red 100%);'>"
		    +"<div style='height:100%;position:relative;width:"+(100-prc)+"%;background-color:white;'>"
			+"<div style='height:100%;padding:0;margin:0;position:absolute;left:5px;top:-2px;font-size:11px;color:black;'>"+(prc)+"%</div>"
		    +"</div>"
		+"</div>";
    },
    stop: function() {
	if(!DOT.progress.id) return;
	clearInterval(DOT.progress.id); DOT.progress.id=false;
	var q=DOT.dom('dotpay_progress'); if(q) document.body.removeChild(q);
    },
},

    AJAX: function(url,data,headers) {
	if(!headers) headers={};
    	headers["Content-Type"] = "application/json";
    	headers["X-Requested-With"] = "XMLHttpRequest";
	var xhr = new XMLHttpRequest();
	xhr.open((data?"POST":"GET"), url, false);
	xhr.withCredentials = true; // Equivalent to "credentials": "include"
	for(var x in headers) xhr.setRequestHeader(x, headers[x]);
	xhr.send(data);
	var s0 = ''+xhr.responseText;
	s=s0.replace(/^\s+/g,'').replace(/\s+$/g,'');
        var w=s.split('{'); // }
	if(w.length>1 && w[0]!='') {
	    DOT.Talert("PHP WARNING: "+DOT.h(w[0]));
	    s=s.substring(w[0].length);
	}
	var json;
        try { json=JSON.parse(s); } catch(e) {
	    json=JSON.stringify({error:"Error parse JSON",original:s0});
	}
	json.http_code_dot = xhr.status;
	return json;
    },

    LOAD: async function(url) {
        const r = await fetch(url,{ method:'GET'/*,mode:'cors',credentials:'include'*/});
        const txt = await r.text();
        if(r.ok) return txt;
        return DOT.error("File not found: " + r.status + " "+txt);
    },

    Transfer: function(to, price, CUR) {
	price=Math.ceil(price);	// 131199999.99999999 ах ты ж сука блять
	console.log("Transfer: "+to+" "+price+" "+CUR);
	if(!CUR) CUR=DOT.CUR; var N = DOT.nodes[CUR];
	if(!N.asset_id) return N.api.tx.balances.transferKeepAlive(to, price); // DOT
	return N.api.tx.assets.transferKeepAlive(N.asset_id, to, price); // Asset
    },

    TransferAll: function(to, bal, CUR) {
	bal=Math.ceil(bal);
	if(!CUR) CUR=DOT.CUR; var N = DOT.nodes[CUR], hash=false;
	if(!N.asset_id) { // Polkadot
	    hash = N.api.tx.balances.transferAll(to, false);
	} else { // Assethub
	    bal -= N.deposit; // Ёбаная магия, чтобы вычислить сумму для transfer
	    if(bal > 0) hash = N.api.tx.assets.transfer(N.asset_id, to, bal);
	}
	return hash;
    },

    payWithPolkadot: async function(SENDER, price, to, CUR) {
	if(!CUR) CUR=DOT.CUR;

	console.log("============> DOT.payWithPolkadot()");

	DOT.Talert('clear');
	await DOT.connect(CUR);

	if(DOT.debug) DOT.Talert('Start balance: '+ await DOT.Balance(to) );

        // Waiting for signature
	console.log("Wallet asking for signature: "+DOT.cx.my_wallet);

	const injector = await polkadotExtensionDapp.web3FromAddress(SENDER);
        DOT.SV.page_Process(); // Transaction is signed. Waiting for transaction block

	await DOT.Transfer(to, price, CUR).signAndSend(SENDER,
	    DOT.add_ah({signer: injector.signer},CUR)
	, ({ status }) => {

	    // start progressbar if not yet
            if(!DOT.progress.id) DOT.progress.run(0,
		    function(){
			DOT.error('Error: timeout');
			setTimeout(DOT.progress.stop,800);
		    }
	    );

	    if(status.isInBlock || status.type == 'InBlock') {
		try {
		    var x=status.asInBlock.toString();
		    console.log("===> status.isInBlock: " + DOT.h(x) );
		    if(x) DOT.cx.my_hash=x;
		    DOT.SV.page_InBlock(DOT.cx.my_hash); // Transaction is completes. Waiting for daemon
		} catch(er){ console.log("Erroro 773: "+er); }
	    } else if(status.isFinalized || status.type == 'Finalized') {
		try { DOT.cx.my_hash = status.asFinalized.toString(); } catch(er) { console.log(er); }
		console.log("===> status.isFinalized: "+DOT.cx.my_hash);
		DOT.progress.stop();
		// payment done!!!
		DOT.flag.paid = 1; // чтоб второй раз не платить
		console.log('payment_done IsFinalized with hash: '+DOT.cx.my_hash);
		DOT.SV.page_IsFinalized('Finalized'); // Transaction is completes. Waiting for daemon
		return;
	    } else {
		console.log("===> status: "+status.type);
	    }
	}).catch((error) => {
            DOT.progress.stop(); // stop progressbar
	    DOT.disconnect();
	    DOT.error('transaction failed: '+error);
        });

    },


    onpaid: function(json,info) {
        if(json.redirect) return DOT.redirect(json.redirect);
	// return DOT.redirect('https://natribu.org'); // LLEO
	return DOT.error('Paid success. What?! Ask admin, what can we do now?');
    },

    // ИЗМЕНЕНИЕ БАЛАНСА
    onBalance: async function(from,to,amount){
	if(DOT.flag.end) return;

	// Это событие связано с платежным аккаунтом?
	if( DOT.cx.pay_acc && ( DOT.cx.pay_acc == to || DOT.cx.pay_acc == from) ) {
	    console.debug("onBalance (pay_acc): "+DOT.indot(amount,1)+ "\n from: "+from+"\n to: "+to );

	    // И сходим проверим баланс, а там и снова обновим re_balance()
	    setTimeout(function(){ DOT.getBalance(DOT.cx.pay_acc,'onbalance:p'); },10);

	    // С цeлевого аккаунта что-то сняли? Это мог сделать только демон!
	    if( DOT.cx.pay_acc == from ) {
		return DOT.SV.page_IsFinalized('onBalance:from'); // ждем реакции демона
	    }

	    // Иначе это нам кто-то что-то прислал на наш платежный
	    DOT.cx.my_acc = from; // платим с этого аккаунта
	    var find=0; for(var e of DOT.accs) { if(e.acc == from) { find=1; break; } }
	    if(!find) { // добавить такой аккаунт если не было
		DOT.accs.push({ acc: from, wallet: 'Manual', name: 'Secret Philanthropist' }); // добавить такой адрес
		for(var e of DOT.accs) { if(e.acc == from) { DOT.html_acc(e); break; } }
		setTimeout(function(){ DOT.getBalance(e.acc,'onbalance:find'); },10);
	    }

	    // возьмем баланс из amount, вдруг пока мы будем его заново читать, его уже оприходуют?
	    if(!DOT.cx.pay_bal) DOT.cx.pay_bal=0;
	    DOT.cx.pay_bal += ( DOT.cx.pay_acc == to ? 1 : -1) * parseInt(amount);
	    // И нарисовать его, если он где висит
	    DOT.setBalance( DOT.cx.pay_acc, DOT.cx.pay_bal );

	    // ушла уже нужная сумма (демон сработал)?
	    if( DOT.cx.pay_bal >= DOT.nodes[DOT.CUR].total_planks ) {
		return DOT.SV.page_IsFinalized('onBalance:summ'); // ждем реакции демона
	    }

	    return;
	}

	// Это событие связано с одним из аккаунтов кошельков пользователя?
	// Мало ли, может пока страница открыта, он сходил на биржу и денег себе докинул...
	for(var a of DOT.accs) {
	    if(a.acc == from || a.acc == to) {
		console.debug("BALANCE acc: amount: "+amount + "\n from: "+from+"\n to: "+to );
		DOT.getBalance(a.acc,'onbalance:accs'); // сходим проверим баланс, а там и обновим re_balance()
		break;
	    }
	}

	// ну а если нет, то к нам это событие вообще не относится
    },

    setPayAccount: function(acc) {
	acc = DOT.west(acc); if(!acc) return DOT.error('error payment_account format');
	if( !DOT.cx.pay_acc ) {
            var k=0;
	    document.querySelectorAll('.B_pay_account').forEach((e)=>{ e.className='B_'+acc; k++; });
            if(k) DOT.getBalance(acc,'setPayAccount');
	}
	DOT.cx.pay_acc=acc;
	return acc;
    },

    mpers: function(s,a) {
      return s.replace(/\{([^\{\}]+)\}/g,function(t0,t1){
        if(typeof(a[t1])!='undefined') return a[t1]; // есть есть такое {значение} - вернуть его
        if(t1.match(/[\s\,\.]+/g)!==null) return t0; // если и имена переменных что-то через запятую - то просто вернуть
        var f=t1.substring(0,1),i=t1.substring(1);
        if(f=='#') return (typeof(a[i])=='undefined'?'': h(a[i]) );
        return '';
      });
    },

    html_accounts: function() {
	DOT.accs.forEach(x=>{ DOT.html_acc(x); });
	DOT.re_balance();
    },

    html_acc: function(a) {
	if(a.elem) return;
	if(!a.acc) {
	    console.log('############ s t r a n g e ############');
	    console.log(a);
	    a.acc='';
	}
	var r={
	    ajaximg: DOT.ajaximg(),
	    name: DOT.h(a.name),
	    acc: DOT.h( DOT.west(a.acc) ),
	    acc_min: DOT.h( a.acc.substring(0,4)+'...'+a.acc.substring(a.acc.length-4) ),
	    wallet: DOT.h( a.wallet ),
	    walletbg: 'bg-'+DOT.walletbg[a.wallet],
	    checked: (a.deff?' checked':''),
	    topup: ( !DOT.is_test()?'':"<div style='position:absolute;top:2px;right:10px;title='Top up my balabce' onclick='DOT.topUpBalance(this)'>💰</div>"),
	};
	// Create a DIV <div id='BT_{wallet}_{acc}' class='kco-account inactive {walletbg} flex-row gap-small' onclick="DOT.SV.select(this,'{acc}')"></div>
	// +"<span class='t-tertiary'>00</span>"
	a.elem = document.createElement("div");
	a.elem.className = DOT.mpers('kco-account inactive {walletbg} flex-row gap-small',r);
	a.elem.onclick = DOT.SV.select;
	a.elem.innerHTML = DOT.mpers(`
<div class='identicon I_{acc}'></div>
<div class='flex-col w100'>
    <span class='t-account-title'>{name}</span>
    <span class='t-account-address'>{acc_min}</span>
</div>
<span class='t-account-balance'>
    <span class='B_{acc}' fmt='00x'>{ajaximg}</span>
</span>
<span class='t-account-balance cx-symbol'></span>
<button class='kco-select'>
    <span>Checkout</span>
    <span class='material-symbols-outlined'>arrow_right_alt</span>
</button>
`,r);
	// нарисовать как-нибудь потом идентикон
	setTimeout(function(){
		// вернуть 1 идентикон, если уже подсчитан, иначе вычислить
		if(a.identicon) return; // если есть, то не надо
		// поискать, вдруг уже есть готовый у такого же акканта, но для другого кошелька
		for(var x of DOT.accs) { if(x.identicon && a.acc === x.acc) { a.identicon = x.identicon; break; } }
		// создать, если не найдено
		if(!a.identicon) a.identicon = DOT.identicon_render(a.acc,24);
		a.elem.querySelectorAll('.I_'+a.acc).forEach(e=>{ e.innerHTML=a.identicon }); // обновить в элементе
		document.querySelectorAll('.I_'+a.acc).forEach(e=>{ e.innerHTML=a.identicon }); // обновить на странице
	},10);
    },

    HowToInstalWallet: function() {
	var s, nav = DOT.navigator();
	if( nav == 'firefox') s = "<a href='https://addons.mozilla.org/en-US/firefox/addon/polkadot-js-extension/'>polkadot{.js} for Firefox</a>";
	else if( nav == 'chrome') s = "<a href='https://chrome.google.com/webstore/detail/polkadot%7Bjs%7D-extension/mopnmbcafieddcagagdcbnhejhlodfdd'>polkadot{.js} for Chrome</a>";
	else s = "<a href='https://github.com/polkadot-js/extension'>polkadot{.js}</a>";

	return "<b>Wallet not found</b>"
		    +"<br>You can use Wallet extention "+s
		    +" or <a href='https://www.talisman.xyz/'>Talisman</a>"
		    +" or <a href='https://www.subwallet.app/'>Subwallet</a>"
		    +"<br>Also you can pay from external wallet: QR look above";
    },


    html_wallets: function() {
	const known = ['polkadotjs','talisman','subwalletjs']; // .bg-
	const other = ['01','02','03','04','05','06','07','08','09','10']; // .bg-
	var a = [...new Set(DOT.accs.map(x => x.wallet))];
	if(!DOT.walletbg) DOT.walletbg={};
	a.forEach(x=>{
	    if(!DOT.walletbg[x]) {
		var c=x.toLowerCase().replace('-','');
		if(!known.includes(c)) c = other.filter(item => !Object.values(DOT.walletbg).includes(item))[0];
		DOT.walletbg[x] = c;
	    }
	});
	var s=''; for(var x in DOT.walletbg) s+="<div class='kco-label bg-"+DOT.walletbg[x]+"'>"+DOT.h(x)+"</div>";
	var w=DOT.dom('sv-wallets'); if(w) w.innerHTML=s;
	return s;
    },

    init: async function(mode) {

	DOT.cx.topupButton = (DOT.is_test() ? "&#128176;" : ''); // 💰
	console.log('DOT init()');
        DOT.Talert('clear');
	DOT.do_button_on();

	// Load scripts if need
	var originalDefine = window.define;
	window.define=undefined; // delete window.define; // йобаные патчи для Magento
	  if(DOT.cx.mainjs) await DOT.LOADS_promice([
	    DOT.cx.mainjs+'bundle-polkadot-util.js',
	    DOT.cx.mainjs+'bundle-polkadot-util-crypto.js',
	    DOT.cx.mainjs+'bundle-polkadot-extension-dapp.js',
	    DOT.cx.mainjs+'bundle-polkadot-types.js',
	    DOT.cx.mainjs+'bundle-polkadot-api.js',
	    DOT.cx.mainjs+'bundle-polkadot-keyring.js', // west
	  ],1,0);
	window.define = originalDefine; // йобаные патчи для Magento

	// init wallets
	var wallets = await DOT.init_wallets();
	if( !wallets ) {
	    var w=DOT.dom('sv-toggle-manual');
	    if(!w) w=DOT.dom('dot_payment_manual');
	    if(w) w.click();
	    DOT.dom('sv-info').innerHTML = DOT.HowToInstalWallet();
	}
	DOT.html_wallets();
	DOT.html_accounts();

	// Getting info
	if(! (await DOT.daemon_get_info()) ) {
	    console.log('DOT.daemon_get_info() return error!');
	    return;
	}

	if(!mode) DOT.initb();
    },

    initb: async function() {
	// узнать все балансы, которые неизвестны
	for(var a of DOT.accs) { if(a.balance === false) a.balance = await DOT.getBalance(a.acc,'init'); }
	if((''+DOT.cx.pay_acc).length > 10) DOT.getBalance(DOT.cx.pay_acc,'init:p');
	// Запустить следилку за мануальным пополнением
	DOT.waitManual.start();
    },

    // connect Wallets
    init_wallets: async function() {
     console.log('Find wallets');
//     try {
        var wallets = await polkadotExtensionDapp.web3Enable('dotpay');
        if( !wallets.length ) { console.log('Wallets not found'); return 0; }

        var deff = DOT.f_read('WalletID');
        DOT.accounts = await polkadotExtensionDapp.web3Accounts({ss58Format:0}); // Polkadot - 0, kusama - 2
        for(var l of DOT.accounts) {
	    var acc = l.address;
	    var name = l.meta.name;
	    var wallet = l.meta.source;
	    // Есть ли такой?
	    var find=0; for(var e of DOT.accs) { if(e.acc == acc && e.wallet == wallet) { find=1; break; } }
	    if(!find) DOT.accs.push({ // добавить такой
	        acc: DOT.west(acc),
	        wallet: DOT.h( ( wallet.charAt(0).toUpperCase()+wallet.slice(1) ).replace(/js$/g,'JS') ),
	        name: DOT.h(name),
	        balance: false, // потом узнаем
	        identicon: false, // потом нарисуем
	        checked: (deff==(acc+'') ? 1 : 0), // последний выбранный?
	    });
	}
//     } catch(err) { console.log('Wallets crash: '+err);	return false; }
     return true;
    },

    // Top up pay_account from Alice for 1/3 of summ (DOT.debug=1 or 'zymologia.fi' present in url)
    topUpPay: async function() {
	document.querySelectorAll('.B_'+DOT.cx.pay_acc).forEach((e)=>{ e.innerHTML=DOT.ajaximg(); });
	document.querySelectorAll('.B_pay_bal').forEach((e)=>{ e.innerHTML=DOT.ajaximg(); });
	DOT.cx.my_hash = await DOT.topUpFromAlice( DOT.cx.pay_acc, Math.ceil(DOT.nodes[DOT.CUR].total_planks / 2) );
    },

    // Top up Balance from Alice for test sites (DOT.debug=1 or 'zymologia.fi' present in url)
    topUpBalance: async function(e,addr) {
	if(e.getAttribute('oldvalue') && e.getAttribute('oldvalue').length) return; // дважды не кликать
	e.setAttribute('oldvalue',e.innerHTML); // сохранить
	e.innerHTML=DOT.ajaximg(); // поставить крутилку
    	if(!addr) addr=e.closest('label').querySelector("input[type='radio']").value;
	await DOT.topUpFromAlice(addr, DOT.nodes[DOT.CUR].total_planks + DOT.nodes[DOT.CUR].total_add_planks );
	e.innerHTML=e.getAttribute('oldvalue'); // вернуть
	e.setAttribute('oldvalue','');
    },

    topUpFromAlice: async function(addr,value, CUR) { if(!CUR) CUR=DOT.CUR;
	value = Math.ceil(value);
	console.debug('Alice pay '+DOT.indot(value,1)+' to ['+addr+']');
        DOT.Talert("Top up "+addr+" for "+DOT.indot(value,1));
	await DOT.connect(); // connect if not
	console.debug('DOT .connected, keyring:');
	var keyring = new polkadotKeyring.Keyring({ type: 'sr25519' });

	if(!DOT.alice) {
	    console.debug("DOT.alice start generating pair for Alice");
	    var d=Date.now();
	    // DOT.alice = keyring.addFromUri('//Alice'); // КРИВОРУКИЕ БЛЯТЬ, 40 СЕКУНД!!! СОРОК СЕКУНД ГЕНЕРИТЬ КЛЮЧ АЛИСЫ В Firefox!!!
	    DOT.alice = keyring.addFromSeed(polkadotUtil.hexToU8a("0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a"));
	    d=Math.round((Date.now()-d)/1000);
	    console.debug('DOT.alice pair ready: '+d+' second: '+DOT.alice.address);
	    if(d>5) console.debug('БЛЯТЬ ЕБАНЫЕ ПИДАРАСЫ, КАК ЖЕ ОНО ТОРМОЗИТ!');
	}

	var hash = await DOT.Transfer(addr, value).signAndSend(DOT.alice,
		DOT.add_ah({signer: injector.signer},CUR)
	);
	console.debug('DOT.alice hash: '+hash);
	DOT.Talert('Transaction sent with hash '+hash);
	return hash.toHex();
    },

    navigator: function(){ // get Browser' name
        var ua=navigator.userAgent, tem;
        var M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if(/trident/i.test(M[1])){
	    tem= /\brv[ :]+(\d+)/g.exec(ua) || [];
            return 'IE '+(tem[1] || '');
	}
        if(M[1]==='Chrome'){
	    tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
    	    if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
	}
	M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
	if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
	return M[0].toLowerCase();
    },

    save_addr: function(x) { DOT.f_save('WalletID',this.value); },


    Balance: async function(acc,CUR) {
	if(!CUR) CUR=DOT.CUR;
	var e,N=DOT.nodes[CUR];
	try {
	    if(N.asset_id) { // Asset
		e = await N.api.query.assets.account( N.asset_id, acc );
		// DOT.e = e;
		// console.log('### Balance ['+CUR+"/"+N.asset_id+"] "+acc+" = "+typeof(e));
		// console.log(e);
		if(!e || !(e = e.toJSON())) return 0;
		return 1*e.balance;
	    } // DOT

	    e = await N.api.query.system.account( acc );
	    return 1*e.data.free.toLocaleString();
	} catch(er) { return DOT.error(er,'Balance'); }
    },



    accname: function(acc) {
	for(var x of DOT.accs) if(x.acc==acc) return x.name;
	return 'Unknown';
    },

    acca: function(acc) {
	for(var x of DOT.accs) if(x.acc==acc) return x;
	return {};
    },

    // скачать баланс и обновить на странице всюду
    getBalance: async function(as,info) {
	// await DOT.connect();
	var acc = as.match(/B_([0-9a-z]+)/gi);
	acc = (acc ? acc.replace(/^B_/g,'') : as);
	// раставили картинки-заглушки
	document.querySelectorAll('.B_'+acc).forEach((e)=>{ e.innerHTML=DOT.ajaximg(); });
	// пошли качать баланс
	if(DOT.nodes[DOT.CUR].api) {
	    var bal = await DOT.Balance(acc,DOT.CUR);
	    // console.log(info+" :["+DOT.CUR+"]: "+DOT.accname(acc)+" = "+bal);
	    DOT.setBalance( acc, bal );
	    return bal;
	}
	return false;
    },

    // баланс известен, обновить его на странице всюду
    setBalance: function(acc,bal) {

	// console.log("setBalance('"+acc+"','"+bal+"')"+DOT.inf());

	if(acc==DOT.cx.pay_acc) {
	    DOT.cx.pay_bal = bal; // Если это наш баланс, то сохранить
	    document.querySelectorAll('.B_pay_bal').forEach((e)=>{ e.innerHTML=DOT.indot( bal, e.getAttribute('fmt') ); });
	}
	document.querySelectorAll('.B_'+acc).forEach((e)=>{ e.innerHTML=DOT.indot( bal, e.getAttribute('fmt') ); });
	try {
	    DOT.acca(acc).elem.querySelectorAll('.B_'+acc).forEach((e)=>{ e.innerHTML=DOT.indot( bal, e.getAttribute('fmt') ); });
	} catch(er){}
	DOT.re_balance(bal,acc);
    },

    west: function(x,CUR) {
	if(x.length != 66 || x.substring(0,2) != '0x') x=DOT.west2id(x);
	return DOT.id2west(x,CUR);
    },

    west2id: function(west){
	try{ return polkadotUtil.u8aToHex(polkadotKeyring.decodeAddress(west)); }
        catch(e) { return false; }
    },

    id2west: function(id,CUR){ id=''+id;
	if(id.length != 66 || id.substring(0,2) !='0x') return false;
	if(!CUR) CUR=DOT.CUR;
	var ss58 = ( DOT.nodes[CUR] && DOT.nodes[CUR].ss58 ? DOT.nodes[CUR].ss58 : 0);
	return polkadotKeyring.encodeAddress(id, ss58);
    },

    disconnect: async function(CUR) {
	    console.log("@@@@@@@@@@@@@@@@@@@@@@@ DOT.disconnect()"+DOT.inf());
	    if(DOT.debug) return;
	if(!CUR) CUR=DOT.CUR;
	var N = DOT.nodes[CUR];
	if(!N) return DOT.error("Error currence: ");
	if(!N.api) return true;
	await N.api.disconnect();
	N.api=false;
	return true;
    },

    connect: async function(CUR) {
	if(!CUR) CUR=DOT.CUR;

	// console.log("DOT.connect("+CUR+")");

	var N = DOT.nodes[CUR];
	if(!N) return DOT.error("Error currence: "+CUR);

    if(!N.api) {
	// соединяемся с блокчейном
	var wss = N.rpc_url.replace(/\:\d+$/g,'');
	var Prov = new polkadotApi.WsProvider(wss);
	var a = { provider: Prov }; // для общего случая коннекта
	if(N.asset_id) { // в случае assetHub добавляем невыразимой мистической хуйни от шамана Габышева и Сёко Асахара
	    a.signedExtensions = {
	          ChargeAssetTxPayment: { extrinsic: {tip: "Compact<Balance>", assetId: "Option<AssetId>" } }
	    };
	}

        ////////////////////////////////////
        const warn = console.warn; console.warn=function(){}; // Подавить сообщения
        async function fun() {
	    return await Promise.race([
    		polkadotApi.ApiPromise.create(a), // Your long-running process
    		new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)) // Timeout promise
	    ]);
	}

	try { N.api = await fun(); } catch(er) {
	    DOT.error("[!] Can't connect");
	    N.api = false;
	}

	console.warn = warn;
	////////////////////////////////////

	// и подписались на события изменения баланса
	if(N.api) {

	    N.api.query.system.events((events) => {
		events.forEach(({ event, phase }) => {
		    // console.log(`\t: ${event.section}:${event.method}:: (phase=${phase.toString()})`);
        	    var [from, to, amount] = event.data;
		    to = (to && to.toString ? DOT.west(to.toString()):false);
		    if(!to) return;
        	    from = (from && from.toString ? DOT.west(from.toString()):false);
        	    amount = (amount && amount.toString ? parseInt(amount.toString()):false);
		    DOT.onBalance(from,to,amount,CUR); // to === YOUR_TARGET_ACCOUNT_ADDRESS
		});
	    });

	    // Для всех таких API чтоб несколько соединений не открывать
	    for(var n in DOT.nodes) { if(n !== CUR && DOT.nodes[n].rpc_url == N.rpc_url) DOT.nodes[n].api = N.api; }

	}
    }

    return N.api;

    },


 LOADS: function(u,f,err,sync,rand) { if(typeof(u)=='string') u=[u];

	if(!window.DOTLOADES) window.DOTLOADES={};

        var randome='?random='+Math.random(); // DEBUG ONLY!
	if(rand===0) randome='';

        var s;
        for(var i of u) { if(window.DOTLOADES[i]) continue;
         if(/\.css($|\?.+?$)/.test(i)) {
            s=document.createElement('link');
            s.type='text/css';
            s.rel='stylesheet';
            s.href=i+randome;
            s.media='screen';
         } else {
            s=document.createElement('script');
            s.type='text/javascript';
            s.src=i+randome;
            s.defer=true;
         }
         s.setAttribute('orign',i);
         if(sync) s.async=false;
         s.onerror=( typeof(err)=='function' ? err : function(e){ DOT.error('File not found: '+e.src); } );
         s.onload=function(e){ e=e.target;

	    window.DOTLOADES[e.getAttribute('orign')]=1;
            var k=1; for(var i of u) {
		if(!window.DOTLOADES[i]){ k=0; break; }
	    }
            if(k){ if(f) f(e.src); }
         };
         document.getElementsByTagName('head').item(0).appendChild(s);
        }
        if(!s) { if(f) f(1); }
 },

 LOADS_sync: function(u,f,err,rand) { DOT.LOADS(u,f,err,1,rand) },

 LOADS_promice: function(file,sync,rand) {
        return new Promise(function(resolve, reject) { DOT.LOADS(file,resolve,reject,sync,rand); });
 },

 cpbuf: function(e,message){ if(typeof(e)=='object') e=e.innerHTML;
    var area = document.createElement('textarea');
    document.body.appendChild(area);
    area.value = e;
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
    // DOT.win_alert('Copy: '+(DOT.h(e).replace(/\n/g,'<br>')) );
 },

ajaxm: "data:image/gif;base64,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",
ajaximg: function(){ return "<img src='"+DOT.ajaxm+"'>"; },
is_test: function() {
    return (
	document.location.href.indexOf('zymologia.fi')>=0
	|| DOT.testmode
	|| DOT.debug
	? true : false
    );
},
alice_keys: function() { return JSON.parse('{"address":"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY","addressRaw":{"0":212,"1":53,"2":147,"3":199,"4":21,"5":253,"6":211,"7":28,"8":97,"9":20,"10":26,"11":189,"12":4,"13":169,"14":159,"15":214,"16":130,"17":44,"18":133,"19":88,"20":133,"21":76,"22":205,"23":227,"24":154,"25":86,"26":132,"27":231,"28":165,"29":109,"30":162,"31":125},"isLocked":false,"meta":{},"publicKey":{"0":212,"1":53,"2":147,"3":199,"4":21,"5":253,"6":211,"7":28,"8":97,"9":20,"10":26,"11":189,"12":4,"13":169,"14":159,"15":214,"16":130,"17":44,"18":133,"19":88,"20":133,"21":76,"22":205,"23":227,"24":154,"25":86,"26":132,"27":231,"28":165,"29":109,"30":162,"31":125},"type":"sr25519"}'); },

// WEB-animation
aFlash: function(p,x){
    p=DOT.dom(p).style; if(!x)x=0.5;
    p.transitionDuration=x+'s';
    p.transform='scale(1.7)';
    setTimeout(function(){ p.transitionDuration=2*x+'s'; p.transform='scale(1)';},x*2000);
    setTimeout(function(){ p.transform='unset'; },x*4200);
},

a360: function(p,x){ p=DOT.dom(p).style; if(!x)x=1;
    p.transitionDuration=x+'s';
    p.transform='rotate(360deg)';
    setTimeout(function(){ p.transform='unset'; },x*1010);
},







template: `

<div class="kco-container flex-col gap-xl">

<section id='sv-section-selectCurrency' class="flex-row gap-medium">
    Kalatori pay with
    <div id='sv-CUR' class="kco-select">
        <span id='sv-USDC'>---</span>
        <span class="material-symbols-outlined">keyboard_arrow_down</span>
    </div>
</section>

<section id='sv-section-aboutPayment' class="flex-col gap-small">
    <div class="flex-row flex-baseline gap-small">
        <span class="t-price"><span class='cx-total'>   </span> <span class='cx-symbol'>   </span></span>
        <span class="t-small t-tertiary">(<span class='cx-total'>   </span>€, 1 <span class='cx-symbol'>   </span> = 1 €)</span>
    </div>
    <div class="t-small">
        Including potential maximum transaction fee up to ~<span class='cx-fee'>   </span> <span class='cx-symbol'>   </span>
        <span class="t-tertiary">(<span class='cx-fee'>   </span>€)</span>
    </div>
</section>

<section id='sv-section-payManual' class="kco-collapsable collapsed">
    <div id='sv-toggle-manual' class="kco-collapse-toggler flex-row">
        <span class="material-symbols-outlined">chevron_right</span>
        <span class="t-title">Pay from external wallet</span>
    </div>
    <div id='sv-toggle-manual-field' class="kco-collapse-content flex-col gap-medium">
        <p class="t-secondary t-small">
            Send your payment to the unique address for your oder. Once <span class='cx-total_min'>   </span> <span class='cx-symbol'>   </span> is received at this address, your order will be completed.
        </p>

        <div class="flex-row flex-start gap-small">
            <div class="sv-terms kco-tac-toggler" val="0">
                <span class="material-symbols-outlined">check_box_outline_blank</span>
                <span class="material-symbols-outlined">check_box</span>
            </div>
            <span>Agree to <u>terms and conditions</u> to see the address and continue with payment</span>
        </div>

        <div class="kco-manual-payment-card flex-col gap-large">
            <div class="kco-manual-address-field blured flex-row gap-medium">
                <span class="t-account-address"><span class='cx-pay_acc'>   </span></span>
                <div class="kco-qr-modal">
                    <img id='sv-QR'>
                </div>
                <button class="kco-button small" onclick="DOT.SV.cpbufACC(this)">
                    <span class="material-symbols-outlined">content_copy</span>
                </button>
                <button class="kco-button small show-qr-btn">
                    <span class="material-symbols-outlined">qr_code_scanner</span>
                </button>
            </div>
            <span class="t-small"><span class='cx-topupButton' onclick='DOT.SV.topup(this)'></span>Total received <span class='cx-pay_bal B_pay_bal'></span> <span class='cx-symbol'></span> / <span class='cx-total_min'></span> <span class='cx-symbol'></span></span>
        </div>
    </div>
</section>

<section id='sv-section-payWallet' class="kco-collapsable flex-col gap-medium">
    <div id='sv-toggle-waller' class="kco-collapse-toggler flex-row">
        <span class="material-symbols-outlined">chevron_right</span>
        <span class="t-title">Pay with browser wallet</span>
    </div>

    <div class="kco-collapse-content flex-col gap-medium">
        <div class="flex-row gap-medium">
            <div id='sv-wallets' class="flex-row gap-small">
			<!-- block -->
            </div>
            <button class="kco-button secondary small" onclick="DOT.re_wallet()">
                <span class="material-symbols-outlined">sync</span>
            </button>
        </div>

        <div class="kco-accounts">
            <div id='sv-accounts-field' class="flex-col gap-large scroll">
			<!-- accounts field -->
            </div>
        </div>
    </div>
</section>

<button id='sv-redirect-button' class="kco-button" style='display:none'>
        You will be redirected to your order in <span id='sv-second-counter'>7</span> seconds
</button>

</div>
`,


date: function(){
    var now = new Date();
    var year = now.getFullYear();
    var month = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
    var day = now.getDate().toString().padStart(2, '0');
    var hours = now.getHours().toString().padStart(2, '0');
    var minutes = now.getMinutes().toString().padStart(2, '0');
    var seconds = now.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
},

round0: function(x) { return Math.round(x*10)/10; },

identicon_render: function(address, size, sixPoint) {
    if(!size) size=128;
    if(typeof(identicon_render_zero)=='undefined') identicon_render_zero = polkadotUtilCrypto.blake2AsU8a(new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),512);
	let s = 64;
	let c = DOT.round0( s / 2 );
	let r = DOT.round0( sixPoint ? (s / 2 / 8 * 5) :  (s / 2 / 4 * 3) );
	let rroot3o2 = DOT.round0( r * Math.sqrt(3) / 2 );
	let ro2 = DOT.round0( r / 2 );
	let rroot3o4 = DOT.round0( r * Math.sqrt(3) / 4 );
	let ro4 = DOT.round0( r / 4 );
	let r3o4 = DOT.round0( r * 3 / 4 );

	let z = DOT.round0( s / 64 * 5 );
	let schema = {
		target: { freq: 1, colors: [0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 1] },
		cube: { freq: 20, colors: [0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 5] },
		quazar: { freq: 16, colors: [1, 2, 3, 1, 2, 4, 5, 5, 4, 1, 2, 3, 1, 2, 4, 5, 5, 4, 0] },
		flower: { freq: 32, colors: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 3] },
		cyclic: { freq: 32, colors: [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 6] },
		vmirror: { freq: 128, colors: [0, 1, 2, 3, 4, 5, 3, 4, 2, 0, 1, 6, 7, 8, 9, 7, 8, 6, 10] },
		hmirror: { freq: 128, colors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 8, 6, 7, 5, 3, 4, 2, 11] }
	}

	let total = Object.keys(schema).map(k => schema[k].freq).reduce((a, b) => a + b)
	let findScheme = d => {
		let cum = 0
		let ks = Object.keys(schema)
		for (let i in ks) {
			let n = schema[ks[i]].freq
			cum += n;
			if (d < cum) {
				return schema[ks[i]]
			}
		}
		throw "Impossible"
	}

	try {
	    var id = polkadotUtilCrypto.decodeAddress(address)
	} catch(er) {
	    var id = address
	}

	if (!(typeof id == 'object' && id && id instanceof Uint8Array && id.length == 32)) {
		return "<svg height=128 width=128 viewBox='0 0 64 64' />";
	}
	let ss58 = polkadotUtilCrypto.encodeAddress(id); // ss58Encode(id);
	id = Array.from(polkadotUtilCrypto.blake2AsU8a(id,512)).map((x, i) => (x + 256 - identicon_render_zero[i]) % 256)

	let sat = (Math.floor(id[29] * 70 / 256 + 26) % 80) + 30
	let d = Math.floor((id[30] + id[31] * 256) % total)
	let scheme = findScheme(d)
	let palette = Array.from(id).map((x, i) => {
		let b = (x + i % 28 * 58) % 256
		if (b == 0) { return '#444' }
		if (b == 255) { return 'transparent' }
		let h = Math.floor(b % 64 * 360 / 64)
		let l = [53, 15, 35, 75][Math.floor(b / 64)]
		return `hsl(${h}, ${sat}%, ${l}%)`
	})

	let rot = (id[28] % 6) * 3

	let colors = scheme.colors.map((_, i) => palette[scheme.colors[i < 18 ? (i + rot) % 18 : 18]])
	let i = 0;

	return "<svg width='"+size+"' height='"+size+"' viewBox='0 0 64 64'>"
		+"<circle r='"+(s / 2)+"' fill='#eee' cx='"+(s / 2)+"' cy='"+(s / 2)+"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+c+"' cy='"+(c - r)+"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+c+"' cy='"+(c - ro2)+"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c - rroot3o4)+"' cy='"+(c - r3o4)+"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c - rroot3o2)+"' cy='"+(c - ro2) +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c - rroot3o4)+"' cy='"+(c - ro4) +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c - rroot3o2)+"' cy='"+c         +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c - rroot3o2)+"' cy='"+(c + ro2) +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c - rroot3o4)+"' cy='"+(c + ro4) +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c - rroot3o4)+"' cy='"+(c + r3o4)+"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+c             +"' cy='"+(c + r)   +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+c             +"' cy='"+(c + ro2) +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c + rroot3o4)+"' cy='"+(c + r3o4)+"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c + rroot3o2)+"' cy='"+(c + ro2) +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c + rroot3o4)+"' cy='"+(c + ro4) +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c + rroot3o2)+"' cy='"+c         +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c + rroot3o2)+"' cy='"+(c - ro2) +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c + rroot3o4)+"' cy='"+(c - ro4) +"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+(c + rroot3o4)+"' cy='"+(c - r3o4)+"' />"
		+"<circle r='"+z+"' fill='"+colors[i++]+"' cx='"+c             +"' cy='"+c          +"'/>"
	+"</svg>";
},

css: `
#polkadot_work {
/*    border: 1px solid #ccc;
    background-color: white;
*/
    display:inline-block;
}

.t-account-title {
    white-space: nowrap;
    max-width: 150px;
    overflow: hidden;
}

.topstick {
    font-size:20px;
    position:absolute;
    top:0px;
    left:0px;
}

/*
#money, #button {
    padding: 20px;
    margin:5px;
    border-radius:10px;
    box-shadow: 4px 7px 16px 4px;
}
*/

#polkadot_work, .kco-container {
    z-index: 2;
}

.kco-label { white-space: nowrap; }

.bg-polkadotjs,.bg-polkadotjs::after { background-color: var(--c-e-polkadotjs); }
.bg-talisman,.bg-talisman::after { background-color: var(--c-e-talisman); }
.bg-subwalletjs,.bg-subwalletjs::after { background-color: #d5e6ff; }
.bg-01,.bg-01::after { background-color: #ece7ff; }
.bg-02,.bg-02::after { background-color: #baf0d0; }
.bg-03,.bg-03::after { background-color: #ead2af; }
.bg-04,.bg-04::after { background-color: #f5d3fd; }
.bg-05,.bg-05::after { background-color: #d2f4f4; }
.bg-06,.bg-06::after { background-color: #fffcaf; }
.bg-07,.bg-07::after { background-color: #ffd2d2; }
.bg-09,.bg-09::after { background-color: #b9f2ab; }
.bg-10,.bg-10::after { background-color: #ffe5ee; }






/*************************************************/






:root {
    font-family: Inter, sans-serif;
    font-feature-settings: 'liga' 1, 'calt' 1; /* fix for Chrome */

    /* colors text, background, ecosystem */
    --c-t: #222;
    --c-t-secondary:#555;
    --c-t-tertiary: #999;
    --c-t-onBtn:    #FFF;
    --c-t-account: #334048;
    --c-b:          #FFF;
    --c-b-btn:      #000;
    --c-b-card:     #F1F5F6;
    --c-b-card-hover:#E8E8F1;
    --c-border:      rgba(0,0,0,0.1);
    --c-e-polkadotjs:#FFD29D;
    --c-e-talisman:  #DBF490;

    /* font */
    --fs-body: 15px;
    --fs-body-small: 13px;
    --fs-button: 15px;
    --fw-button: 600;
    --fs-price: 21px;
    --fw-price: 600;
    --fs-title: 16px;
    --fw-title: 600;
    --fs-title-small: 13px;
    --fs-label: 13px;
    --fw-label: 500;
    --fs-account-title: 16px;
    --fw-account-title: 600;
    --fs-account-address: 12px;
    --fs-account-balance: 13px;
    --card-shadow: 0px 3px 2px 0px rgba(0, 0, 0, 0.02), 0px 6px 6px 0px rgba(0, 0, 0, 0.03), 0px 12px 12px 0px rgba(0, 0, 0, 0.04), 0px 20px 20px 0px rgba(0, 0, 0, 0.04), 0px 40px 32px 0px rgba(0, 0, 0, 0.05), 0px 100px 80px 0px rgba(0, 0, 0, 0.07);
}
@supports (font-variation-settings: normal) {
    :root { font-family: InterVariable, sans-serif; }
}

.t-secondary {
    color: var(--c-t-secondary);
}
.t-tertiary {
    color: var(--c-t-tertiary);
}
.t-small {
    font-size: var(--fs-body-small);
    letter-spacing: 0.01em;
    line-height: 1.3em;
}

.t-price {
    font-size: var(--fs-price);
    font-weight: var(--fw-price);
}
.t-title {
    font-size: var(--fs-title);
    font-weight: var(--fw-title);
}
.t-title-small {
    font-size: var(--fs-title-small);
    font-weight: var(--fw-title);
}


[class^='t-account'] {
    color: var(--c-t-account);
}
.t-account-title {
    font-size: var(--fs-account-title);
    font-weight: var(--fw-account-title);
}
.t-account-address {
    font-size: var(--fs-account-address);
    font-weight: var(--fw-account-address);
    font-family: monospace;
}
.t-account-balance {
    font-size: var(--fs-account-balance);
    font-weight: var(--fw-account-balance);
    font-family: monospace;
    letter-spacing: 0.01em;
}

/* ecosystem colors */
.bg-polkadotjs {
    background-color: var(--c-e-polkadotjs);
}
.bg-talisman {
    background-color: var(--c-e-talisman);
}

/* generic styles */
.w100 {
    width: 100%;
}
.disabled {
    pointer-events: none;
    opacity: 0.4 !important;
}
.invisible {
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
}
.ani-spin {
    -webkit-animation:spin 2s linear infinite;
    -moz-animation:spin 2s linear infinite;
    animation: spin 2s linear infinite;
}
@-moz-keyframes spin { 100% { -moz-transform: rotate(360deg); } }
@-webkit-keyframes spin { 100% { -webkit-transform: rotate(360deg); } }
@keyframes spin { 100% { -webkit-transform: rotate(360deg); transform:rotate(360deg); } }

.kco-tac-reveal {
    visibility: hidden;
    pointer-events: none;
}
body.kco-tac-accepted .kco-tac-reveal {
    visibility: visible;
    pointer-events: all;
}

/* generic containers */
.flex-col {
    display: flex;
    flex-direction: column;
}
.flex-row {
    display: flex;
    align-items: center;
}
.flex-baseline {
    align-items: baseline;
}
.flex-start {
    align-items: flex-start;
}

.gap-xl {
    gap: 24px;
}
.gap-large {
    gap: 16px;
}
.gap-medium {
    gap: 8px;
}
.gap-small {
    gap: 4px;
}

.material-symbols-outlined {
    font-size: 1.4em;
    opacity: 0.7;
}

/* placeholders */
.identicon {
    width: 24px;
    height: 24px;
    min-width: 24px;
    background: #d2d8da;
    border-radius: 999px;
}

/* kalatori checkout UI components */
.kco-container {
    width: 100%;
    max-width: 320px;
    padding: 16px 32px 32px;
    background: var(--c-b);
    border-radius: 16px;
}

.kco-collapsable.collapsed > .kco-collapse-toggler .material-symbols-outlined {
    rotate: 0deg;
}
.kco-collapse-toggler .material-symbols-outlined {
    rotate: 90deg;
    transition: rotate 0.3s;
}
.kco-collapse-toggler {
    cursor: pointer;
}
.kco-collapsable.collapsed .kco-collapse-content {
    max-height: 0;
    overflow: hidden;
}

.kco-select, .kco-button, .kco-notification {
    display: flex;
    align-items: center;
    border-radius: 4px;
    border: none;
    font-size: var(--fs-button);
    font-weight: var(--fw-button);
    letter-spacing: 0.01em;
}
.kco-select, .kco-button {
    justify-content: center;
    color: var(--c-t-onBtn);
    background-color: var(--c-b-btn);
    cursor: pointer;
    opacity: 0.8;
}
.kco-select:hover, .kco-button:hover {
    opacity: 1;
}

.kco-button {
    padding: 8px 16px;
}
.kco-button.secondary {
    background-color: var(--c-b-card);
    color: var(--c-t);
}
.kco-button.tertiary {
    background-color: inherit;
    color: inherit;
}
.kco-button.small {
    height: 28px;
    padding: 6px;
    text-wrap: nowrap;
    width: fit-content;
}
.kco-button.tiny {
    font-size: var(--fs-body-small);
    width: fit-content;
    padding: 4px 6px;
}

.kco-select {
    gap: 4px;
    width: min-content;
    align-items: center;
    font-size: var(--fs-button);
    font-weight: var(--fw-button);
    padding: 4px 6px 4px 10px;
}

.kco-notification {
    justify-content: space-between;
}

.kco-label {
    font-size: var(--fs-label);
    font-weight: var(--fw-label);
    border-radius: 999px;
    padding: 6px 12px;
}

.kco-manual-payment-card {
    padding: 16px;
    border-left: solid 1px var(--c-border);
}
.kco-manual-payment-card.state-processing {
    border: solid 1px var(--c-border);
    border-radius: 16px;
}
.kco-manual-address-field {
    border: solid 1px var(--c-border);
    border-radius: 8px;
    padding: 6px 8px;
    background: var(--c-b-card);
    overflow-wrap: anywhere;
}
.kco-manual-address-field.blured {
    pointer-events: none;
}
.kco-manual-address-field.blured .t-account-address {
    filter: blur(4px);
}
.kco-manual-address-field.blured .kco-button {
    opacity: 0;
}

.kco-tac-toggler {
    cursor: pointer;
}
.kco-tac-toggler[val^='1'] span:nth-child(1) {
    display: none;
}
.kco-tac-toggler[val^='0'] span:nth-child(2) {
    display: none;
}

.kco-qr-modal {
    position: absolute;
    z-index: 999;
    width: 228px;
    height: 228px;
    box-shadow: var(--card-shadow);
    background: var(--c-b);
    padding: 24px;
    border-radius: 16px;
    visibility: hidden;
}
.kco-qr-modal::after {
    content: ' ';
    position: fixed;
    z-index: -1;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: var(--c-b);
    opacity: 0.1;
}
.kco-qr-modal.opened {
    visibility: visible;
}
.kco-qr-modal img {
    width: 100%;
    height: 100%;
    border-radius: 8px;
}

.kco-accounts {
    position: relative;
    box-shadow: var(--card-shadow);
    border-radius: 0 0 16px 16px;
}
.scroll {
    max-height: 350px;
    overflow: scroll;
    padding: 16px;
}

.kco-account {
    position: relative;
    padding: 6px 8px;
    background-color: var(--c-b-card);
    border-radius: 8px;
}
.kco-account.inactive {
    opacity: 0.6;
}
.kco-account:after {
    content: " ";
    width: 8px;
    height: 8px;
    position: absolute;
    top: -2px;
    left: -2px;
    border-radius: 999px;
}
.kco-account.polkadotjs::after {
    background-color: var(--c-e-polkadotjs);
}
.kco-account.talisman::after {
    background-color: var(--c-e-talisman);
}

.kco-account.active:hover,
.kco-account.selected {
    background-color: var(--c-b-card-hover);
    cursor: pointer;
}
.kco-account.active:hover .t-account-balance {
    display: none;
}

.kco-account .kco-select {
    position: absolute;
    pointer-events: none;
    opacity: 0;
    right: 0;
    margin-right: 60px;
    transition: all 0.3s;
}
.kco-account.active:hover .kco-select {
    display: flex;
    pointer-events: all;
    margin-right: 8px;
    opacity: 1;
}
.kco-account.active:hover .kco-select {
    margin-right: 8px;
    opacity: 1;
}
`,



};


// export DOT:
try { module.exports = DOT; } catch(e){}


kalatori_donate = async function(ara) { if(!ara) ara={};
/*
    {
        total: 12.5, // [required!]
        order: 'sdfeewd1234_*',
        destination: '1sa1P9pU4Pa6JM2nyB2vcAQw9cCxttzpovAmCwcUHZ6UxET',
        currency: 'USD',
    }
*/

    if(!ara.total && DOT.dom('money') && 1*(DOT.dom('money').value)) ara.total=1*(DOT.dom('money').value);
    if(!ara.total) ara.total=2; // return DOT.error('Total = 0');

//    await DOT.LOADS_promice([
//        'https://site.zymologia.fi/KALATORI-JS/donate.css',
//    ],1,0);

    if(!DOT.dom('polkadot_work')) {

	if(typeof(ohelpc)!='undefined') ohelpc('polkadot_work_pole','Donate with DOT',"<div id='polkadot_work'></div>");
	else {
	    let div = document.createElement('div');
	    div.id = 'polkadot_work';
	    div.innerHTML='';
	    document.body.insertBefore(div,document.body.firstChild);
	}
    }

    if(!ara.order) ara.order = '*';
    ara.order=ara.order.replace('*',DOT.date());

    // Свой собственный целевой адрес
    if(ara.destination) DOT.destination = ara.destination;

    DOT.store = 'donate-api2';
    DOT.cx.daemon_direct = 'https://kalatori-js.zymologia.fi'; // 'http://localhost:16726'
    DOT.cx.mainjs = "https://site.zymologia.fi/KALATORI-JS/vendor/";
    DOT.cx.order_id = ara.order;
    DOT.cx.total = ara.total;
    DOT.cx.currency = (ara.currency?ara.currency:'USD');
    if(ara.currencies) DOT.cx.currencies = ara.currencies;

    DOT.button_on = function(){ }; // DOT.dom('button').style.display='block'; };
    DOT.button_off = function(){ }; // DOT.dom('button').style.display='none'; };
    // DOT.onpaid = function() { alert("ONPAID"); };
    if(typeof(kalatori_onpaid)=='function') DOT.onpaid = kalatori_onpaid;
    else DOT.onpaid = function() { dom('polkadot_work',"Tnx a lot!!!"); };
    DOT.design();
    // DOT.init();
};

