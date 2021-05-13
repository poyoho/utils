use wasm_bindgen::prelude::*;
use js_sys::*;
extern crate web_sys;
use md5;

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
    #[wasm_bindgen]
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
  log("Hello, rust-webasm-template!");
}

#[wasm_bindgen]
pub struct HashHelper {
  ctx: md5::Context,
}


#[wasm_bindgen]
impl HashHelper {
  pub fn new() -> HashHelper{
    HashHelper {
      ctx: md5::Context::new(),
    }
  }

  pub fn append (&mut self, data: &[u8]) {
    self.ctx.consume(data);
  }

  pub fn end(self) -> JsString {
    let digest = self.ctx.compute();
    let hex: JsString = JsString::from(format!("{:x}", digest).as_str());
    JsString::from(hex)
  }
}
