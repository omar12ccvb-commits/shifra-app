/* SHIFRA — browser push notifications */
(function(){
  'use strict';

  const SW_PATH = '/sw.js';
  const PUSH_SUPPORT = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

  function urlBase64ToUint8Array(base64String){
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(ch => ch.charCodeAt(0)));
  }

  function friendlyError(err){
    const name = String(err?.name || '');
    const msg = String(err?.message || '');
    if(name === 'NotAllowedError') return 'المتصفح منع الإشعارات. اسمح لإشعارات SHIFRA من إعدادات الموقع ثم جرّب مرة أخرى.';
    if(name === 'InvalidStateError') return 'المتصفح لم يجهز خدمة الإشعارات بشكل صحيح. اقفل الموقع وافتحه مرة ثانية ثم جرّب التفعيل.';
    if(name === 'AbortError') return 'تفعيل الإشعارات توقف قبل أن يكتمل. جرّب التفعيل مرة أخرى.';
    if(/push service|push subscription|subscribe/i.test(msg)) return 'تعذر تسجيل جهازك لاستقبال إشعارات SHIFRA. جرّب التفعيل مرة أخرى.';
    if(/VAPID|server|السيرفر/i.test(msg)) return 'خدمة الإشعارات في SHIFRA غير جاهزة حاليًا. حاول مرة أخرى بعد قليل.';
    return 'تعذر تفعيل إشعارات SHIFRA على هذا الجهاز. راجع إذن الإشعارات وحاول مرة أخرى.';
  }

  async function getPushRegistration(){
    if(!PUSH_SUPPORT || !window.isSecureContext) return null;
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope:'/',
      updateViaCache:'none',
    });
    try{ await registration.update(); }catch(e){}
    return registration.active ? registration : await navigator.serviceWorker.ready;
  }

  async function getPushState(){
    if(!PUSH_SUPPORT || !window.isSecureContext){
      return {
        supported:false,
        permission:'unsupported',
        subscribed:false,
        configured:false,
        message:'هذا الجهاز/المتصفح لا يدعم إشعارات SHIFRA الخارجية.'
      };
    }

    const permission = Notification.permission;
    try{
      const r = await api('/notifications/push/status');
      return {
        supported:true,
        permission,
        subscribed:Boolean(r.subscribed),
        configured:Boolean(r.enabled),
        message: Boolean(r.enabled) ? (
          permission === 'granted' && Boolean(r.subscribed) ? 'الإشعارات مفعلة وجاهزة.' :
          permission === 'denied' ? 'الإشعارات مقفولة من إعدادات المتصفح.' :
          'الإشعارات جاهزة للتفعيل.'
        ) : 'خدمة الإشعارات غير مفعلة على السيرفر حاليًا.'
      };
    }catch(e){
      return {
        supported:true,
        permission,
        subscribed:false,
        configured:false,
        message:'تعذر قراءة حالة الإشعارات من SHIFRA.'
      };
    }
  }

  async function syncPushSubscription(){
    if (!state.token || !PUSH_SUPPORT || !window.isSecureContext) return {subscribed:false, supported:false};

    const registration = await getPushRegistration();
    if (!registration) return {subscribed:false};

    if (Notification.permission !== 'granted') {
      return {subscribed:false, permission:Notification.permission};
    }

    const publicResponse = await api('/notifications/push/public-key');
    if (!publicResponse.enabled || !publicResponse.publicKey) {
      throw new Error('push service is not configured');
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(publicResponse.publicKey),
      });
    }

    const json = subscription.toJSON();
    if(!json?.endpoint || !json?.keys?.p256dh || !json?.keys?.auth){
      throw new Error('push subscription is incomplete');
    }

    await api('/notifications/push/subscribe', {
      method:'POST',
      body:{
        subscription:json,
        userAgent:navigator.userAgent,
      },
    });

    return {subscribed:true, permission:'granted'};
  }

  async function enablePushNotifications(options={}){
    const silent = Boolean(options.silent);

    if (!PUSH_SUPPORT || !window.isSecureContext) {
      if (!silent) toast('الإشعارات الخارجية غير متاحة في المتصفح المفتوح به SHIFRA. افتح SHIFRA في Chrome أو متصفح يدعم إشعارات المواقع.', 'err');
      return {subscribed:false, supported:false};
    }

    try{
      if (Notification.permission === 'denied') {
        if (!silent) toast('الإشعارات مقفولة من إعدادات المتصفح. اسمح لـ SHIFRA بالإشعارات من إعدادات الموقع ثم اضغط تفعيل مرة أخرى.', 'err');
        return {subscribed:false, permission:'denied'};
      }

      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          if (!silent) toast('لم يتم السماح لإشعارات SHIFRA على هذا الجهاز.', 'err');
          return {subscribed:false, permission};
        }
      }

      const result = await syncPushSubscription();
      if (!silent) {
        toast(
          result.subscribed ? 'تم تفعيل إشعارات SHIFRA على جهازك 🔔' : 'لم يكتمل تفعيل الإشعارات.',
          result.subscribed ? 'ok' : 'err'
        );
      }
      return result;
    }catch(err){
      if (!silent) toast(friendlyError(err), 'err');
      return {subscribed:false, error:err, message:friendlyError(err)};
    }
  }

  async function testPushNotifications(){
    try{
      const result = await enablePushNotifications({silent:true});
      if (!result.subscribed) {
        toast(result.message || 'فعّل إشعارات SHIFRA أولًا.', 'err');
        return;
      }
      const response = await api('/notifications/push/test', {method:'POST'});
      if(response?.ok) toast('تم إرسال إشعار اختبار. لو لم يظهر، افتح إعدادات إشعارات الموقع وتأكد أن SHIFRA مسموح له بإرسال الإشعارات.', 'ok');
      else toast('تعذر إرسال إشعار الاختبار.', 'err');
    }catch(err){
      toast(friendlyError(err), 'err');
    }
  }

  async function diagnosePushNotifications(){
    const stateInfo = await getPushState();
    let registrationReady = false;
    let browserSubscription = false;
    try{
      const registration = await getPushRegistration();
      registrationReady = Boolean(registration);
      browserSubscription = Boolean(await registration?.pushManager?.getSubscription());
    }catch(e){}
    return {
      ...stateInfo,
      registrationReady,
      browserSubscription,
      message: stateInfo.permission === 'denied'
        ? 'الإشعارات مقفولة من إعدادات المتصفح.'
        : (stateInfo.subscribed && browserSubscription
          ? 'الإشعارات مفعلة على الجهاز.'
          : stateInfo.configured
            ? 'الخدمة جاهزة لكن الجهاز يحتاج تفعيل الإشعارات.'
            : stateInfo.message)
    };
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
      const registration = await getPushRegistration();
      if (Notification.permission === 'granted' && registration) await syncPushSubscription();
    }catch(e){}
  }

  window.enablePushNotifications = enablePushNotifications;
  window.testPushNotifications = testPushNotifications;
  window.initPushNotifications = initPushNotifications;
  window.detachPushSubscription = detachPushSubscription;
  window.getPushNotificationState = getPushState;
  window.diagnosePushNotifications = diagnosePushNotifications;
})();
