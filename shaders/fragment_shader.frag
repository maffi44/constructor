#version 140

uniform float width_coefficient;
uniform vec3 camera_position;
uniform mat3 rotation_matrix;
uniform float time;

#define MAX_STEPS 100
#define MIN_DIST 0.01
#define MAX_DIST 200.
in vec2 coord;
out vec4 output_color;

struct Camera {
    vec3 position;
    vec3 ray_direction;
};

float sd_capsule(vec3 p, vec3 b, float radius) {

    float d = dot(b, p) / dot(b, b);
    if (d <= 0.0) return length(p) - radius;
    if (d >= 1.0) return length(p - b) - radius;
    return length((b * d) - p) - radius;
}

float sd_box(vec3 p, vec3 size) {
    return length(max(abs(p) - size, 0.0));
}

float sd_torus(vec3 p, float radius1, float radius2) {
    float x = length(p.xz) - radius1;
    return length(vec2(x, p.y)) - radius2;
}

float sd_sphere(vec3 p, float radius) {
    return length(p) - radius;
}

float sd_inf_cylinder(vec3 p, float radius) {
    return length(p.xz) - radius;
}

float sd_cylinder(vec3 ap, vec3 ab, float radius) {
    float t = dot(ap, ab) / dot(ab, ab);
    float d = length(ab * t - ap) - radius;
    float y = (abs(t - 0.5) - 0.5) * length(ab);
    float e = length(max(vec2(d,y), 0));
    float i = min(max(d,y), 0);
    return e + i;
}


float get_dist(vec3 p) {
    float dist_sphere = min(
        sd_sphere(p - vec3(0.0, 5.0, 5.0), 2.0),
        sd_sphere(p - vec3(2.0, 7.0, 2.0 * sin(time)), 1.0)
    );
    float dist_capsule = sd_capsule(p - vec3(-2.0, 2.0, 0.0), vec3(0.0, 2.0, 2.0), 1.0);

    float dist = min(dist_capsule, dist_sphere);

    dist = min(dist, sd_inf_cylinder(p - vec3(4.0, 0.0, 3.0), 2.0));

    //dist = min(dist, sd_torus(p, 3.0, 1.0));

    //dist = min(dist, sd_box(p - vec3(-5.0, 1.0, 0.0), vec3(0.5, 0.5, 2.0)));

    //dist = min(dist, sd_cylinder(p - vec3(2.0, 3.0, 5.0), vec3(3.0, 5.0, 1.0), 1.5));

    return min(p.y, dist);
}


vec3 get_normal(vec3 point) {
    float dist = get_dist(point);
    return normalize(
        dist - vec3(
            get_dist(point - vec3(0.01, 0.0, 0.0)),
            get_dist(point - vec3(0.0, 0.01, 0.0)),
            get_dist(point - vec3(0.0, 0.0, 0.01))
        ));
}

float ray_march(vec3 position, vec3 direction) {
    float ray_lenght = 0.0;
    float dist_to_surf = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 point = position + direction * ray_lenght;

        dist_to_surf = get_dist(point);
        
        ray_lenght += dist_to_surf;
        if (dist_to_surf < MIN_DIST || ray_lenght > MAX_DIST) {
            break;
        }
    }
    return ray_lenght;
}

float get_lighting(vec3 point) {
    
    vec3 light_position = vec3(0.0, 17.0, 4.0);
    
    light_position.xz += vec2(sin(time) * 10., cos(time) * 5.);

    vec3 light_ray = light_position - point;

    vec3 light_normal = normalize(light_ray);

    vec3 normal = get_normal(point);

    float diffuse = mix(0.0, 0.47, dot(light_normal, normal));

    if (ray_march(point + normal * MIN_DIST * 2, light_normal) < length(light_ray)) {
        diffuse *= 0.01;
    }
    return diffuse;
}

void main() {
    vec2 uv_coord = vec2(coord.x * width_coefficient, coord.y); 
    
    vec3 ray_direction = normalize(vec3(uv_coord, 1.0));

    ray_direction = ray_direction * rotation_matrix;

    float dist = ray_march(camera_position, ray_direction);

    float color = get_lighting(camera_position + ray_direction * dist);

    output_color = vec4(vec3(color), 1.0);
}