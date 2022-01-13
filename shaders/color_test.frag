#version 420

uniform float aspect;
uniform vec3 camera_position;
uniform mat3 rotation_matrix;
uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform float iFrameRate;
uniform vec4 iMouse;

in vec2 fragCoord;
out vec4 fragColor;

void main() {
    fragColor = vec4(fragCoord / iResolution.xy, 1.0, 1.0);
}