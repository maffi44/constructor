#[macro_use]
extern crate glium;
use std::thread;
use std::time;

use glium::Display;
use glium::IndexBuffer;
use glium::Surface;
use glium::VertexBuffer;
use glium::glutin::event::VirtualKeyCode;
use glium::glutin::event_loop::ControlFlow;
use glium::glutin::event_loop::EventLoopClosed;
use glium::glutin::platform::unix::x11::EventLoop;
use glium::index::IndexType;

#[derive(Clone, Copy)]
struct Vertex {
    position: [f32; 2],
    coordinates: [f32; 2],
}

implement_vertex!(Vertex, position, coordinates);

fn main() {

    let (display, events_loop) = create_context();

    let (vertex_buffer, indices_buffer) = create_buffers(&display);

    let (vertex_shader_src, fragment_shader_src) = create_shaders();

    let program = glium::Program::from_source(
        &display,
        vertex_shader_src,
        fragment_shader_src,
        None
    ).unwrap();

    let mut x: f32 = 0.0;
    let mut y: f32 = 0.0;

    let (width, height) = display.get_framebuffer_dimensions();

    events_loop.run(move |event, event_loop_wt, control_flow| {
        match event {
            glium::glutin::event::Event::WindowEvent {event: win_event, ..} =>
            {
                match win_event {
                    glium::glutin::event::WindowEvent::KeyboardInput {
                        input,
                        ..
                    } => {
                        match input {
                            glium::glutin::event::KeyboardInput {
                                virtual_keycode,
                                ..
                            } => {
                                match virtual_keycode {
                                    Some(key) => {
                                        match key {
                                            VirtualKeyCode::Escape => *control_flow = ControlFlow::Exit,
                                            _ => {},                                            
                                        }
                                    },
                                    None => {},
                                }
                            },
                        }
                    },
                    glium::glutin::event::WindowEvent::CloseRequested => { *control_flow = ControlFlow::Exit },
                    glium::glutin::event::WindowEvent::CursorMoved {position, ..} => {
                        x = position.x as f32 / width as f32;
                        y = position.y as f32 / height as f32;
                    }
                    _ => {},
                }
            },
            _ => {},
        }

        let mut frame = display.draw();

        frame.draw(
            &vertex_buffer,
            &indices_buffer,
            &program,
            &uniform! {x: x, y: y},
            &glium::draw_parameters::DrawParameters::default()
        ).unwrap();

        frame.finish().unwrap();


        thread::yield_now();
        //thread::sleep(time::Duration::from_millis(16));


    });

}

fn create_buffers(display: &Display) -> (VertexBuffer<Vertex>, IndexBuffer<u8>) {
    let shape = vec![
        Vertex { position: [-1.0, 1.0], coordinates: [0.0, 0.0] },
        Vertex { position: [1.0, 1.0], coordinates: [1.0, 1.0] },
        Vertex { position: [-1.0, -1.0], coordinates: [0.0, 1.0] },
        Vertex { position: [1.0, -1.0], coordinates: [1.0, 0.0] },
    ];

    let vertex_buffer = glium::VertexBuffer::new(display, &shape).unwrap();

    let indices_buffer = glium::index::IndexBuffer::new(
        display,
        glium::index::PrimitiveType::TrianglesList,
        &vec![0u8, 1u8, 2u8, 1u8, 3u8, 2u8]
    ).unwrap();

    (vertex_buffer, indices_buffer)
}

fn create_shaders() -> (&'static str, &'static str) {
    let vertex_shader_src = r#"
    #version 140

    in vec2 position;
    in vec2 coordinates;
    out vec2 coord;

    

    void main() {
        vec2 pos = position;
        coord = coordinates;

        gl_Position = vec4(pos, 0.0, 1.0);
    }
    "#;

    let fragment_shader_src = r#"
    #version 140

    uniform float x;
    uniform float y;

    in vec2 coord;
    out vec4 color;

    void main() {
        vec2 new = coord;
        new.x += x;
        new.y -= y;
        color = vec4(x, y, 1.0, 1.0);
    }
    "#;

    (vertex_shader_src, fragment_shader_src)
}

fn create_context() -> (Display, glium::glutin::event_loop::EventLoop<()>) {
        // 1. The **winit::EventsLoop** for handling events.
        let mut events_loop = glium::glutin::event_loop::EventLoop::new();

        // 2. Parameters for building the Window.
        let wb = glium::glutin::window::WindowBuilder::new()
            .with_inner_size(glium::glutin::dpi::LogicalSize::new(1024.0, 768.0))
            .with_title("Hello world");
    
        // 3. Parameters for building the OpenGL context.
        let cb = glium::glutin::ContextBuilder::new();
    
        // 4. Build the Display with the given window and OpenGL context parameters and register the
        //    window with the events_loop.
        let display = glium::Display::new(wb, cb, &events_loop).unwrap();

        (display, events_loop)
}