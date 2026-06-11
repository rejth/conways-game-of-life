mod simulation;

use simulation::App;
use winit::event_loop::EventLoop;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

pub fn run(#[cfg(target_arch = "wasm32")] canvas_id: String) -> anyhow::Result<()> {
    #[cfg(not(target_arch = "wasm32"))]
    {
        env_logger::init();
    }
    #[cfg(target_arch = "wasm32")]
    {
        console_log::init_with_level(log::Level::Info).unwrap_throw();
    }

    let event_loop = EventLoop::with_user_event().build()?;
    let mut app = App::new(
        #[cfg(target_arch = "wasm32")]
        &event_loop,
        #[cfg(target_arch = "wasm32")]
        canvas_id,
    );

    event_loop.run_app(&mut app)?;

    Ok(())
}

// This is the entry point for the WASM build.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn run_web(canvas_id: String) -> Result<(), wasm_bindgen::JsValue> {
    #[cfg(debug_assertions)]
    console_error_panic_hook::set_once();

    run(canvas_id).unwrap_throw();

    Ok(())
}
