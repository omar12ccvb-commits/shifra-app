/* SHIFRA — browser push notifications */
(function(){
  const SW_PATH = '/sw.js';
  const PUSH_SUPPORT = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

  function urlBase64ToUint8Array(base64String){
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(ch => ch.charCodeAt(0)));
  }

  async function getPushRegistration(){
    if (!PUSH_SUPPORT || !window.isSecureContext) return null;
    return navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  }

  async function getPushState(){
    if (!PUSH_SUPPORT) return { supported:false, permission:'unsupported', subscribed:false };
    const permission = Notification.permission;
    try{
      const r = await api('/notifications/push/status');
      return {
        supported:true,
        permission,
        subscribed:Boolean(r.subscribed),
        configured:Boolean(r.enabled),
      };
    }catch(e){
      return { supported:true, permission, subscribed:false, configured:false };
    }
  }

  async function syncPushSubscription(){
    if (!state.token || !PUSH_SUPPORT || !window.isSecureContext) return { subscribed:false };
    const registration = await getPushRegistration();
    if (!registration) return { subscribed:false };

    if (Notification.permission !== 'granted') {
      return { subscribed:false, permission:Notification.permission };
    }

    const publicResponse = await api('/notifications/push/public-key');
    if (!publicResponse.enabled || !publicResponse.publicKey) {
      throw new Error('إشعارات الجهاز غير مفعلة على السيرفر حاليًا.');
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(publicResponse.publicKey),
      });
    }

    await api('/notifications/push/subscribe', {
      method:'POST',
      body:{
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      },
    });

    return { subscribed:true, permission:'granted' };
  }

  async function enablePushNotifications(options={}){
    const silent = Boolean(options.silent);
    if (!PUSH_SUPPORT || !window.isSecureContext) {
      if (!silent) toast('متصفحك الحالي لا يدعم إشعارات SHIFRA الخارجية.', 'err');
      return { subscribed:false, supported:false };
    }

    try{
      if (Notification.permission === 'denied') {
        if (!silent) toast('إشعارات SHIFRA مقفولة من إعدادات المتصفح. فعّلها ثم جرّب مرة أخرى.', 'err');
        return { subscribed:false, permission:'denied' };
      }

      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          if (!silent) toast('لم يتم تفعيل إشعارات الجهاز.', 'err');
          return { subscribed:false, permission };
        }
      }

      const result = await syncPushSubscription();
      if (!silent) {
        toast(result.subscribed ? 'تم تفعيل إشعارات SHIFRA على جهازك 🔔' : 'تعذر تفعيل إشعارات الجهاز.', result.subscribed ? 'ok' : 'err');
      }
      return result;
    }catch(err){
      if (!silent) toast(err?.message || 'تعذر تفعيل إشعارات الجهاز.', 'err');
      return { subscribed:false, error:err };
    }
  }

  async function testPushNotifications(){
    try{
      const result = await enablePushNotifications({silent:true});
      if (!result.subscribed) {
        toast('فعّل إشعارات الجهاز أولًا.', 'err');
        return;
      }
      await api('/notifications/push/test', {method:'POST'});
      toast('بعتنا إشعار اختبار لجهازك. المفروض يظهر خارج الموقع كمان.', 'ok');
    }catch(err){
      toast(err?.message || 'تعذر إرسال إشعار الاختبار.', 'err');
    }
  }

  async function detachPushSubscription(){
    if (!PUSH_SUPPORT || !state.token) return;
    try{
      const registration = await navigator.serviceWorker.getRegistration(SW_PATH) || await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager?.getSubscription();
      if (!subscription) return;

      const token = state.token;
      const base = state.apiBase || '/api';
      await fetch(base + '/notifications/push/subscribe', {
        method:'DELETE',
        headers:{
          'Content-Type':'application/json',
          Authorization:'Bearer ' + token,
        },
        body:JSON.stringify({endpoint:subscription.endpoint}),
        keepalive:true,
      });
    }catch(e){}
  }

  async function initPushNotifications(){
    if (!state.token || !PUSH_SUPPORT || !window.isSecureContext) return;
    try{
      await getPushRegistration();
      if (Notification.permission === 'granted') await syncPushSubscription();
    }catch(e){}
  }

  window.enablePushNotifications = enablePushNotifications;
  window.testPushNotifications = testPushNotifications;
  window.initPushNotifications = initPushNotifications;
  window.detachPushSubscription = detachPushSubscription;
})();
