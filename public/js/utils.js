export const BRL = (cents) => (cents / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
});
export const toCents = (valor) =>
    Math.round(parseFloat(valor.toString().replace(',', '.')) * 100);
export const alertx = (msg) => window.alert(msg);
export const cartStore = {
    key: 'cart_v1',
    get() {
        try { return JSON.parse(localStorage.getItem(this.key)) || []; }
        catch (e) { return []; }
    },
    set(items) { localStorage.setItem(this.key, JSON.stringify(items)); },
    clear() { localStorage.removeItem(this.key); }
}
