use wasm_bindgen::prelude::*;
use js_sys::*;

pub fn set_panic_hook() {
  // When the `console_error_panic_hook` feature is enabled, we can call the
  // `set_panic_hook` function at least once during initialization, and then
  // we will get better error messages if our code ever panics.
  //
  // For more details see
  // https://github.com/rustwasm/console_error_panic_hook#readme
  #[cfg(feature = "console_error_panic_hook")]
  console_error_panic_hook::set_once();
}


// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);
    #[wasm_bindgen(js_namespace = wx)]
    fn showModal(param: &Object);
}

#[wasm_bindgen]
pub fn greet() {
  log("Hello, rust-webasm-template!");
}

use md5;

#[wasm_bindgen]
pub fn hash(data: JsValue) -> JsValue {
  let data: String = JsString::from(data).into();
  let digest = md5::compute(data.as_bytes());
  let hex: JsString = JsString::from(format!("{:x}", digest).as_str());
  JsValue::from(JsString::from(hex))
}
