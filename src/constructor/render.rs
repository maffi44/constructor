use glium::Display;
use glium::IndexBuffer;
use glium::Program;
use glium::Surface;
use glium::VertexBuffer;
use glm::{cos, sin};
use std::f32::consts::PI;
use std::io::Read;
use std::time;
use std::fs;

#[derive(Clone, Copy)]
struct Vertex {
    position: [f32; 2],
    coordinates: [f32; 2],
}

implement_vertex!(Vertex, position, coordinates);

struct ShaderData {
    width_coefficient: f32,
    camera_position: [f32; 3],
    rotation_matrix: [[f32; 3]; 3],
    time: f32,
}

pub struct RenderData {
    pub frame_input: FrameInput,
    pub display: Display,
    program: Program,
    vertex_buffer: VertexBuffer<Vertex>,
    indices_buffer: IndexBuffer<u8>,
    
}

pub struct FrameInput {
    pub mouse_input_x: f32,
    pub mouse_input_y: f32,
    pub display_width: u32,
    pub display_height: u32,
    pub time: time::SystemTime,
    pub delta_time: time::SystemTime,
    pub camera_position: [f32; 3],
    pub w_pressed: bool,
    pub s_pressed: bool,
    pub a_pressed: bool,
    pub d_pressed: bool,
    pub mouse_button3_pressed: bool,
    pub mouse_button3_first_click: bool,
    pub saved_angle_x: f32,
    pub saved_angle_y: f32,
    pub last_angle_x: f32,
    pub last_angle_y: f32,
    pub saved_mouse_input_x: f32,
    pub saved_mouse_input_y: f32,
}

impl FrameInput {
    
    fn calculate_data(&mut self) -> ShaderData {

        let speed = 200.0_f32;

        let delta = self.delta_time.elapsed().unwrap().as_secs_f32();

        let mut movement_vector = [0.0, 0.0, 0.0];

        if self.w_pressed {
            movement_vector[2] += speed * delta;
        };
        if self.s_pressed {
            movement_vector[2] -= speed * delta;
        };
        if self.a_pressed {
            movement_vector[0] -= speed * delta;
        };
        if self.d_pressed {
            movement_vector[0] += speed * delta;
        };

        if self.mouse_button3_pressed {

            if self.mouse_button3_first_click {
                
                self.mouse_button3_first_click = false;
                self.saved_angle_x = self.last_angle_x;
                self.saved_angle_y = self.last_angle_y;
                self.saved_mouse_input_x = self.mouse_input_x;
                self.saved_mouse_input_y = self.mouse_input_y;
            }
            
            self.last_angle_x = self.saved_angle_x - (((self.saved_mouse_input_x - self.mouse_input_x) / self.display_width as f32) * 4.0);
            self.last_angle_y = (self.saved_angle_y - ((self.saved_mouse_input_y - self.mouse_input_y) / self.display_height as f32)  * 4.0).clamp(-PI / 2., PI / 2.);
        }

        let rotation_matrix = [
            [cos(self.last_angle_x), sin(self.last_angle_y) * sin(self.last_angle_x), cos(self.last_angle_y) * sin(self.last_angle_x)],
            [0.0, cos(self.last_angle_y), -sin(self.last_angle_y)],
            [-sin(self.last_angle_x), sin(self.last_angle_y) * cos(self.last_angle_x), cos(self.last_angle_y) * cos(self.last_angle_x)],
        ];

        let rotated_movement_vector = [
            movement_vector[0] * rotation_matrix[0][0] + movement_vector[1] * rotation_matrix[0][1] + movement_vector[2] * rotation_matrix[0][2],
            movement_vector[0] * rotation_matrix[1][0] + movement_vector[1] * rotation_matrix[1][1] + movement_vector[2] * rotation_matrix[1][2],
            movement_vector[0] * rotation_matrix[2][0] + movement_vector[1] * rotation_matrix[2][1] + movement_vector[2] * rotation_matrix[2][2],
        ];

        self.camera_position = [
            self.camera_position[0] + rotated_movement_vector[0],
            self.camera_position[1] + rotated_movement_vector[1],
            self.camera_position[2] + rotated_movement_vector[2],
        ];

        
        if self.camera_position[1] < 0.1 {self.camera_position[1] = 0.1};


        ShaderData {
           width_coefficient: self.display_width as f32 / self.display_height as f32,

           camera_position: self.camera_position,

           rotation_matrix: rotation_matrix,

           time: self.time.elapsed().unwrap().as_secs_f32(),
        }
    }
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

use std::env;


fn create_shaders() -> (String, String) {

    let mut args: Vec<String> = env::args().collect();

    let mut vertex_file = fs::File::open("shaders/vertex_shader.vert").unwrap();
    let mut fragment_file: fs::File;

    if args.len() > 1 {
        args[1] = String::from("shaders/") + &args[1];
        fragment_file = fs::File::open(args[1].as_str()).unwrap();
    } else {
        fragment_file = fs::File::open("shaders/fragment_shader.frag").unwrap();
    }

    

    let mut vertex_shader_src = String::new();
    let mut fragment_shader_src = String::new();

    vertex_file.read_to_string(&mut vertex_shader_src).unwrap();
    fragment_file.read_to_string(&mut fragment_shader_src).unwrap();

    (vertex_shader_src, fragment_shader_src)
}

fn create_context() -> (Display, glium::glutin::event_loop::EventLoop<()>) {
        // 1. The **winit::EventsLoop** for handling events.
        let events_loop = glium::glutin::event_loop::EventLoop::new();

        // 2. Parameters for building the Window.
        let wb = glium::glutin::window::WindowBuilder::new()
            .with_inner_size(glium::glutin::dpi::LogicalSize::new(800.0, 600.0))
            .with_title("Constructor");
    
        // 3. Parameters for building the OpenGL context.
        let cb = glium::glutin::ContextBuilder::new().with_hardware_acceleration(Some(true)).with_vsync(true);
    
        // 4. Build the Display with the given window and OpenGL context parameters and register the
        //    window with the events_loop.
        let display = glium::Display::new(wb, cb, &events_loop).unwrap();

        (display, events_loop)
}

pub fn create_render_data_and_eventloop() -> (RenderData, glium::glutin::event_loop::EventLoop<()>) {

    let (display, events_loop) = create_context();

    let (vertex_buffer, indices_buffer) = create_buffers(&display);

    let (vertex_shader_src, fragment_shader_src) = create_shaders();

    let program = glium::Program::from_source(
        &display,
        vertex_shader_src.as_str(),
        fragment_shader_src.as_str(),
        None
    ).unwrap();

    let (display_width, display_height) = display.get_framebuffer_dimensions();

    let frame_input = FrameInput {
        mouse_input_x: 0.0,
        mouse_input_y: 0.0,
        display_width: display_width,
        display_height: display_height,
        time: time::SystemTime::now(),
        delta_time: time::SystemTime::now(),
        camera_position: [0.0, 1.0, 0.0],
        w_pressed: false,
        s_pressed: false,
        a_pressed: false,
        d_pressed: false,
        mouse_button3_pressed: false,
        mouse_button3_first_click: true,
        saved_angle_x: 0.0,
        saved_angle_y: 0.0,
        last_angle_x: 0.0,
        last_angle_y: 0.0,
        saved_mouse_input_x: 0.0,
        saved_mouse_input_y: 0.0,
    };

    (
        RenderData {
            display: display,
            program: program,
            vertex_buffer: vertex_buffer,
            indices_buffer: indices_buffer,
            frame_input: frame_input,
        },
        events_loop
    )
}

pub fn render_frame(render_data: &mut RenderData) {

    let mut frame = render_data.display.draw();

    let frame_data = render_data.frame_input.calculate_data();

    frame.draw(
        &render_data.vertex_buffer,
        &render_data.indices_buffer,
        &render_data.program,
        &uniform! {
            width_coefficient: frame_data.width_coefficient,
            camera_position: frame_data.camera_position,
            rotation_matrix: frame_data.rotation_matrix,
            time: frame_data.time,
        },
        &glium::draw_parameters::DrawParameters::default()
    ).unwrap();

    frame.finish().unwrap();
    
    render_data.frame_input.delta_time = time::SystemTime::now();
}