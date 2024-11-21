<section>
    <div id='polkadot_work'>Loading engine... If you see this message long enough to read to the end, something has gone wrong.</div>
</section>

<script>

    var s=document.createElement('script');
    s.type='text/javascript';
    s.src="{$module_host nofilter}/js/DOT.js"
	    + '?random='+Math.random() // DEBUG ONLY!
    ;
    s.onerror=function(e){ alert('DOT plugin: script not found: '+e.src) };
    s.onload=function(e) {
	DOT.presta_init({
	    wpath:	 "{$module_host nofilter}",
	    ajax_url:	 "{$ajax_url nofilter}",
	    total:	 "{$total nofilter}",
	    amount:	 "{$amount nofilter}",
	    module_name: "{$module_name nofilter}",
	    order_id:	 "{$order_id nofilter}",
	    shop_id:	 "{$shop_id nofilter}",
	    // products:	 "{$products nofilter}",
	    currency:	 "{$currency nofilter}",
	    currences:	 "{$currences nofilter}",
	    name:	 "{$name nofilter}",
	});
    };
    document.getElementsByTagName('head').item(0).appendChild(s);
</script>