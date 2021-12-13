#version 140

in vec2 position;
in vec2 coordinates;
out vec2 coord;

void main() {
    vec2 pos = position;
    coord = position;
    gl_Position = vec4(pos, 0.0, 1.0);
}