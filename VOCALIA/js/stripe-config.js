// Configuration Stripe pour VOCALIA
const STRIPE_CONFIG = {
    publishableKey: 'pk_test_51SIkhuFzGIz9kApxKwFOq3UJWUQyAyBJQTiXom8u8ufV61xgiZwnunKwXXfc8Qe2UCdO5eTd1WQPqAmOxHpav3Tk00GYxSsCJ1',
    PRICE_ID: 'price_1SJ2PdFzGIz9kApxnVFvWAsa',
    priceId: 'price_1SJ2PdFzGIz9kApxnVFvWAsa',
    // ✅ IMPORTANT : Ajouter {CHECKOUT_SESSION_ID} pour que Stripe passe la session
    successUrl: 'http://127.0.0.1:5501/pages/success.html?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'http://127.0.0.1:5501/pages/cancel.html'
};

// Export global
window.STRIPE_CONFIG = STRIPE_CONFIG;

console.log('✅ Stripe Config chargée:', {
    publishableKey: STRIPE_CONFIG.publishableKey.substring(0, 20) + '...',
    priceId: STRIPE_CONFIG.priceId,
    successUrl: STRIPE_CONFIG.successUrl,
    cancelUrl: STRIPE_CONFIG.cancelUrl
});