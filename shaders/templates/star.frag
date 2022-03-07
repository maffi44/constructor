#version 420

uniform float aspect;
uniform vec3 camera_position;
uniform mat3 rotation_matrix;
uniform vec3 xyz_change;
uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform float iFrameRate;
uniform vec4 iMouse;

#define time iTime
#define MAX_STEPS 150
#define PI 3.1415926535897
#define MIN_DIST 0.0008
#define MAX_DIST 200.
in vec2 fragCoord;
out vec4 fragColor;

#define BO


mat2 rotate(float angle) {
    //angle *= 0.017453;
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

float sd_sphere(vec3 p, float radius) {
    return length(p) - radius;
}

float sd_box(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

float sd_torus(vec3 p, float radius1, float radius2) {
    float x = length(p.xz) - radius1;
    return length(vec2(x, p.y)) - radius2;
}

float sd_capsule(vec3 p, vec3 b, float radius) {

    float d = dot(b, p) / dot(b, b);
    if (d <= 0.0) return length(p) - radius;
    if (d >= 1.0) return length(p - b) - radius;
    return length((b * d) - p) - radius;
}

float sd_inf_cylinder(vec3 p, float radius) {
    return length(p.xz) - radius;
}

float map(vec3 p) {

    p -= vec3(0., 1., 5.);

    // point.xz *= rotate(iTime / 6.5);
    // point.yz *= rotate(iTime / 12.5);

    // point *= (cos(iTime) * 0.1) + 0.5;

    // point.x = mod(point.x, 7.0) - 3.5;
    // point.y = mod(point.y, 7.0) - 3.5;
    // point.z = mod(point.z, 7.0) - 3.5;

    // point.xz *= rotate(sin(iTime));
    // point.yz *= rotate(cos(iTime));

    //point *= (cos(iTime) * 0.2) + 0.5;


/*
    #ifdef BOX
    float d = sd_box(point, vec3(1., 1., 1.));
    d = max(d, -sd_box(point, vec3(0.5, 0.5, 2.)));
    d = max(d, -sd_box(point, vec3(0.5, 2., 0.5)));
    d = max(d, -sd_box(point, vec3(2., 0.5, 0.5)));
    d = mix(d, sd_sphere(point, 1.37), sin(iTime * 5.));

    #else
    float d = sd_box(point, vec3(1.49, 0.41, 0.41));
    d = min(d, sd_box(point, vec3(0.41, 0.41, 1.49)));
    d = min(d, sd_box(point, vec3(0.41, 1.49, 0.41)));
    //d = max(d, -sd_box(point, vec3(2., 0.5, 0.5)));
    d = mix(d, sd_sphere(point, 1.37 * min(sin(atan(point.x, point.y) * 12.) / 2. + 1.5, sin(atan(point.x, point.z) * 12.) / 2. + 1.5)), sin(iTime * 1.34));
    #endif
    */

    /*
    float num_of_pikes = 3 * (sin(iTime / 2.) / 2. + 1.5); 
    float d = sd_sphere(point, 1.37 * min(
        min(sin(atan(point.x, point.y) * num_of_pikes) / 2. + 1.5, sin(atan(point.x, point.z) * num_of_pikes) / 2. + 1.5),
            sin(atan(point.z, point.y) * num_of_pikes) / 2. + 1.5));

    */


    //float d = sd_sphere(point * sin, 1.37);

    //float n = 1.3 * ((sin(iTime) / 2.) + 1.5);

    //n = 1.;

    float a = -abs(sin(atan(p.x, p.y) * xyz_change.x)) + 1.0;
    float b = -abs(sin(atan(p.z, p.x) * xyz_change.y)) + 1.0;
    float c = -abs(sin(atan(p.y, p.z) * xyz_change.z)) + 1.0;

    float d = sd_sphere(p, 2. - max(a, max(b, c)));

    return d * 0.13;
}

vec3 get_normal(vec3 p) {
    vec2 e = vec2(0.001, -0.001);
    vec3 a = p + e.yxx;
    vec3 b = p + e.xyx;
    vec3 c = p + e.xxy;
    vec3 d = p + e.yyy;

    float fa = map(a);
    float fb = map(b);
    float fc = map(c);
    float fd = map(d);

    return normalize(
        e.yxx * fa +
        e.xyx * fb +
        e.xxy * fc +
        e.yyy * fd
    );
}

vec2 ray_march(vec3 ray_origin, vec3 ray_direction) {
    vec3 color = vec3(0, 0, 0);
    float total_distance = 0.;

    int i = 0;
    for (; i < MAX_STEPS; i++) {
        float d = map(ray_origin);
        total_distance += d;

        if (d < 0.) {
            color.z = 1.;
            return vec2(total_distance, float(i));
        }
        if (d < MIN_DIST) {
            color.x = 1.;
            return vec2(total_distance, float(i));
        }
        if (total_distance > MAX_DIST) {
            color.y = 1.;
            return vec2(total_distance, float(i));
        }

        ray_origin += ray_direction * d;
    }
    //color.z = 1.;
    return vec2(total_distance, float(i));
}

void main() {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.;
    uv.x *= aspect;

    vec3 ray_direction = normalize(vec3(uv, 1.));
    ray_direction *= rotation_matrix;

    vec2 dist_and_depth = ray_march(camera_position, ray_direction); 

    vec3 normal = get_normal(dist_and_depth.x * ray_direction + camera_position);

    float shade = dot(normal, normalize(vec3(0.2, 1, 0.5))); 

    fragColor = vec4(vec3(dist_and_depth.y / MAX_STEPS. * shade, .0, .0), 1.);
}   