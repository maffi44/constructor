#version 140

in vec2 position;
in vec2 coordinates;
out vec2 fragCoord;

void main() {
    fragCoord = position;
    gl_Position = vec4(position, 0.0, 1.0);
}