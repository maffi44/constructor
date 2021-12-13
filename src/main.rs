#[macro_use]
extern crate glium;
mod constructor;

use constructor::render::{create_render_data_and_eventloop, render_frame};
use glium::glutin::event::VirtualKeyCode;
use glium::glutin::event_loop::ControlFlow;

fn main() {

    let (mut render_data, events_loop) = create_render_data_and_eventloop();

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
                                state,
                                ..
                            } => {
                                match virtual_keycode {
                                    Some(key) => {
                                        match key {
                                            VirtualKeyCode::Escape => *control_flow = ControlFlow::Exit,
                                            VirtualKeyCode::W => match state {
                                                glium::glutin::event::ElementState::Pressed => {render_data.frame_input.w_pressed = true},
                                                glium::glutin::event::ElementState::Released => {render_data.frame_input.w_pressed = false}
                                            },
                                            VirtualKeyCode::S => match state {
                                                glium::glutin::event::ElementState::Pressed => {render_data.frame_input.s_pressed = true},
                                                glium::glutin::event::ElementState::Released => {render_data.frame_input.s_pressed = false}
                                            },
                                            VirtualKeyCode::A => match state {
                                                glium::glutin::event::ElementState::Pressed => {render_data.frame_input.a_pressed = true},
                                                glium::glutin::event::ElementState::Released => {render_data.frame_input.a_pressed = false}
                                            },
                                            VirtualKeyCode::D => match state {
                                                glium::glutin::event::ElementState::Pressed => {render_data.frame_input.d_pressed = true},
                                                glium::glutin::event::ElementState::Released => {render_data.frame_input.d_pressed = false}
                                            },
                                            _ => {},                                            
                                        }
                                    },
                                    None => {},
                                }
                            },
                        }
                    },
                    glium::glutin::event::WindowEvent::MouseInput {
                        button, state, ..} => {
                            match button {
                                glium::glutin::event::MouseButton::Middle => {
                                    match state {
                                        glium::glutin::event::ElementState::Pressed => {render_data.frame_input.mouse_button3_pressed = true},
                                        glium::glutin::event::ElementState::Released => {
                                            render_data.frame_input.mouse_button3_pressed = false;
                                            render_data.frame_input.mouse_button3_first_click = true;
                                        },
                                    }
                                },
                                _ => {},
                            }
                        },
                    glium::glutin::event::WindowEvent::CloseRequested => { *control_flow = ControlFlow::Exit },
                    glium::glutin::event::WindowEvent::CursorMoved {position, ..} => {
                        render_data.frame_input.mouse_input_x = position.x as f32;
                        render_data.frame_input.mouse_input_y = position.y as f32;
                    },
                    glium::glutin::event::WindowEvent::Resized (new_size) => {
                        render_data.frame_input.display_width = new_size.width;
                        render_data.frame_input.display_height = new_size.height;
                    },
                    _ => {},
                }
            },
            glium::glutin::event::Event::RedrawRequested(_) => {

                render_frame(&mut render_data);
            },
            glium::glutin::event::Event::MainEventsCleared => {
                render_data.display.gl_window().window().request_redraw();
            },
            _ => {},
        }
    });

}
