#version 420

uniform float aspect;
uniform vec3 camera_position;
uniform mat3 rotation_matrix;
uniform vec3 iResolution;
uniform vec3 xyz_change;
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform float iFrameRate;
uniform vec4 iMouse;
uniform float iStaticTime;

//uniform float powe = 2.0;

#define time iTime
#define MAX_STEPS 150
#define PI 3.1415926535897
#define MIN_DIST 0.0008
#define MAX_DIST 1000.
in vec2 fragCoord;
out vec4 fragColor;


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

float sd_mandelbrod(vec3 position) {
    float power = -4.0 + iTime / 3.1;
    vec3 p = position;
    float dr = 1.0;
    float r;

    for (int i = 0; i < 15; i++) {
        r = length(p);
        if (r > 2.0) {
            break;
        }

        float theta = acos(p.z / r) * power;
        float phi = atan(p.y, p.x) * power;
        float zr = pow(r, power);
        dr = pow(r, power - 1.0) * power * dr + 1.0;

        p = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        p += position;
    }
    return 0.5 * log(r) * r / dr;
}

float map(vec3 p) {
    vec3 point = p;
    point -= vec3(0.9, 1.5, 2.4);
    point.xz *= rotate(iTime / 6.0);
    // point.x = mod(point.x, 3.0) - 1.5;
    // point.z += float(floor(point.x * 2));

    // point -= vec3(0., 1., 3.);
    //point.xz *= rotate(iTime / 1.8);

    //float d = sd_sphere(point, 0.26);
    //float d = sd_box(point, vec3(0.26));
    //d = max(sd_mandelbrod(point + vec3(0.3, 0.5, 0.1) * 0.9), d);
    //d = mix(d, sd_mandelbrod(point), (cos(iStaticTime * 0.6) * 0.5) + 0.5);
    float d = sd_mandelbrod(point );

    return d;
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


    vec2 dist_and_depth = ray_march(camera_position + vec3(0.9, 0.5, 0.6), ray_direction); 

    vec3 normal = get_normal(dist_and_depth.x * ray_direction + camera_position);

    float shade = dot(normal, normalize(vec3(0.2, 1, 0.5))); 

    shade = clamp(shade, 0.4, 1.0);

    fragColor = vec4(vec3(dist_and_depth.y * 1.6 / MAX_STEPS. * (shade * 2.5), dist_and_depth.y * 0.005, 0.7), 1.);
}