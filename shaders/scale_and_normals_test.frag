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

#define time iTime
#define MAX_STEPS 150
#define MIN_DIST 0.01
#define MAX_DIST 200.
in vec2 fragCoord;
out vec4 fragColor;


float sd_sphere(vec3 p, float radius) {
    return length(p) - radius;
}

float sd_box(vec3 p, vec3 size) {
    return length(max(abs(p) - size, 0.0));
}

float get_distance(vec3 p) {
    vec3 point = p - vec3(0., 1., 2.);
    point.xyz *= 2.;
    return sd_box(point, vec3(2., 2., 2.));
}

vec3 ray_march(vec3 ray_origin, vec3 ray_direction) {
    vec3 color = vec3(0, 0, 0);
    float total_distance = 0.;

    for (int i = 0; i < MAX_STEPS; i++) {
        float d = get_distance(ray_origin);
        total_distance += d;

        if (d < 0.) {
            color.z = 1.;
            return color;
        }
        if (d < MIN_DIST) {
            color.x = 1.;
            return color;
        }
        if (total_distance > MAX_DIST) {
            color.y = 1.;
            return color;
        }

        ray_origin += ray_direction * d;
    }
    //color.z = 1.;
    return color;
}

void main() {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.;
    uv.x *= aspect;

    vec3 ray_direction = normalize(vec3(uv, 1.));
    ray_direction *= rotation_matrix;

    vec3 color = ray_march(camera_position, ray_direction);

    fragColor = vec4(color, 1.);
}