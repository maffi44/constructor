#[macro_use]
extern crate glium;

use glium::Display;
use glium::IndexBuffer;
use glium::Surface;
use glium::VertexBuffer;
use glium::glutin::event::VirtualKeyCode;
use glium::glutin::event_loop::ControlFlow;
use std::time;

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

    let mut mouse_input_x: u32 = 0;
    let mut mouse_input_y: u32 = 0;
    let (mut display_width, mut display_height) = display.get_framebuffer_dimensions();
    let current_time = time::SystemTime::now();

    //run main event loop for catch os events and render scene
    events_loop.run(move |event, _event_loop_wt, control_flow| {

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
                        mouse_input_x = position.x as u32;
                        mouse_input_y = position.y as u32;
                    },
                    glium::glutin::event::WindowEvent::Resized (new_size) => {
                        display_width = new_size.width;
                        display_height = new_size.height;
                    },
                    _ => {},
                }
            },
            glium::glutin::event::Event::RedrawRequested(_) => {

                let mut frame = display.draw();

                let time = current_time.elapsed().unwrap().as_secs_f32();

                frame.draw(
                    &vertex_buffer,
                    &indices_buffer,
                    &program,
                    &uniform! {
                        mouse_x: mouse_input_x as f32 / display_width as f32,
                        mouse_y: mouse_input_y as f32 / display_height as f32,
                        height: display_height,
                        width: display_width,
                        time: time,
                    },
                    &glium::draw_parameters::DrawParameters::default()
                ).unwrap();

                frame.finish().unwrap();

            },
            glium::glutin::event::Event::MainEventsCleared => {
                display.gl_window().window().request_redraw();
            },
            _ => {},
        }
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
        coord = position;

        gl_Position = vec4(pos, 0.0, 1.0);
    }
    "#;

    //in this fragment shader write main part of graphic program
    let fragment_shader_src = r#"
    #version 140

    uniform float mouse_x;
    uniform float mouse_y;
    uniform uint height;
    uniform uint width;
    uniform float time;

    #define MAX_STEPS 50
    #define MIN_DIST 0.01
    #define MAX_DIST 100

    in vec2 coord;
    out vec4 color;



    struct Camera {
        vec3 position;
        vec3 ray_direction;
    };

    float sd_sphere(vec3 p) {

        return length(p - vec3(0.0, 1.0, 3.0)) - 1.0;
    }

    float get_dist(vec3 point_from) {

        return min(sd_sphere(point_from), point_from.y);
    }

    float ray_march(Camera camera) {

        vec3 marching_point = camera.position;

        float dist_to_surf = 0;
        float full_dist = 0;
        for (int i = 0; i < MAX_STEPS; i++) {
            dist_to_surf = get_dist(marching_point);
            
            full_dist += dist_to_surf;

            if (dist_to_surf < MIN_DIST || full_dist > MAX_DIST) {
                break;
                //return vec4(1.0, 1.0, 1.0, 1.0);
            }

            marching_point = marching_point + (dist_to_surf * camera.ray_direction);
        }

        return full_dist;
    }

    void main() {
        vec2 uv_coord = vec2(coord.x * (float(width) / float(height)), coord.y); 

        Camera camera = Camera( vec3(0.0, 1.0, 0.0), normalize(vec3(uv_coord, 1.0)) );

        color = vec4(vec3(ray_march(camera) / 50), 1.0);
    }
    "#;

    (vertex_shader_src, fragment_shader_src)
}

fn create_context() -> (Display, glium::glutin::event_loop::EventLoop<()>) {
        // 1. The **winit::EventsLoop** for handling events.
        let events_loop = glium::glutin::event_loop::EventLoop::new();

        // 2. Parameters for building the Window.
        let wb = glium::glutin::window::WindowBuilder::new()
            .with_inner_size(glium::glutin::dpi::LogicalSize::new(1024.0, 768.0))
            .with_title("Constructor");
    
        // 3. Parameters for building the OpenGL context.
        let cb = glium::glutin::ContextBuilder::new().with_hardware_acceleration(Some(true)).with_vsync(true);
    
        // 4. Build the Display with the given window and OpenGL context parameters and register the
        //    window with the events_loop.
        let display = glium::Display::new(wb, cb, &events_loop).unwrap();

        (display, events_loop)
}
