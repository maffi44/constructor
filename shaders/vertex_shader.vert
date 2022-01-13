#version 140

uniform vec3 iResolution;

in vec2 position;
in vec2 coordinates;
out vec2 fragCoord;

void main() {
    fragCoord = coordinates * iResolution.xy;
    gl_Position = vec4(position, 0.0, 1.0);
}