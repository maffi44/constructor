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
#define MIN_DIST 0.001
#define MAX_DIST 200.
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
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0)) - 0.3;
}

float map(vec3 p) {
    vec3 point = p - vec3(0., 1., 2.);
    //point.xz *= rotate(iTime);
    //point.x *= 4.;
    float d = sd_box(point, vec3(1., 1.4, 1.));
    d = min(d, sd_sphere(p - vec3(0., 3., 1.), 1.)); 
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

    vec2 dist_and_color = ray_march(camera_position, ray_direction); 

    vec3 normal = get_normal(dist_and_color.x * ray_direction + camera_position);

    float shade = dot(normal, normalize(vec3(0.2, 1, 0.5))); 

    fragColor = vec4(vec3(dist_and_color.y / MAX_STEPS., 0., 0.), 1.);
}