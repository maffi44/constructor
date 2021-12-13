#version 140

uniform float width_coefficient;
uniform vec3 camera_position;
uniform mat3 rotation_matrix;
uniform float time;

#define MAX_STEPS 100
#define MIN_DIST 0.01
#define MAX_DIST 200
in vec2 coord;
out vec4 output_color;

struct Camera {
    vec3 position;
    vec3 ray_direction;
};

float sd_sphere(vec3 p) {
    return length(p - vec3(0.0, 1.0, 5.0)) - 1.0;
}

float sd_sphere_2(vec3 p) {
    return length(p - vec3(-4.0, 0.5 * (sin(time) + 1), 0.0)) - 1.0;
}

float get_dist(vec3 point_from) {
    return min(min(sd_sphere(point_from), point_from.y), sd_sphere_2(point_from));
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
    vec3 marching_point = position;
    float dist_to_surf = 0;
    float full_dist = 0;
    vec3 light_vector = vec3(1.0, 1.0, 0.0);

    int i;
    for (i = 0; i < MAX_STEPS; i++) {
        dist_to_surf = get_dist(marching_point);
        
        full_dist += dist_to_surf;
        if (dist_to_surf < MIN_DIST || full_dist > MAX_DIST) {
            break;
        }
        marching_point = marching_point + (dist_to_surf * direction);
    }

    return full_dist;
}

float get_lighting(vec3 point) {
    
    vec3 light_position = vec3(0.0, 7.0, 4.0);
    
    light_position.xz += vec2(sin(time), cos(time));

    vec3 light_ray = light_position - point;

    vec3 light_normal = normalize(light_ray);

    vec3 normal = get_normal(point);

    if (ray_march(light_position, light_normal * -1) < length(light_ray) - 0.1) {
        return 0.0;
    }
    return clamp(dot(light_normal, normal), 0.0, 1.0);
}

void main() {
    vec2 uv_coord = vec2(coord.x * width_coefficient, coord.y); 
    
    vec3 ray_direction = normalize(vec3(uv_coord, 1.0));

    ray_direction = ray_direction * rotation_matrix;

    float dist = ray_march(camera_position, ray_direction);

    float color = get_lighting(camera_position + ray_direction * dist);

    output_color = vec4(vec3(color), 1.0);
}