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

// Code by Flopine

// Thanks to wsmind, leon, XT95, lsdlive, lamogui, 
// Coyhot, Alkama,YX, NuSan and slerpy for teaching me

// Thanks LJ for giving me the spark :3

// Thanks to the Cookie Collective, which build a cozy and safe environment for me 
// and other to sprout :)  https://twitter.com/CookieDemoparty

// Shader made for Everyday ATI challenge

#define PI 3.141592
#define TAU (2.*PI)

mat2 rot (float a)
{return mat2(cos(a),sin(a),-sin(a),cos(a));}

void mo (inout vec2 p , vec2 d)
{
    p = abs(p)-d;
    if (p.y>p.x) p = p.yx;
}

void moda(inout vec2 p, float rep)
{
    float per = TAU/rep;
    float a = atan(p.y,p.x);
    float l = length(p);
    a = mod(a,per)-per*0.5;
    p = vec2(cos(a),sin(a))*l;
}

float cyl (vec3 p, float r, float h)
{return max(length(p.xy)-r,abs(p.z)-h);}

float plane (vec3 p, vec3 n)
{return dot(p,normalize(n));}

float stack (vec3 p)
{
    p.y += 4.;
    p.xz *= rot(sin(p.y+iTime));
    moda(p.xz,6.);
    p.x -= 0.15+abs(p.y)*0.5 ;
    return cyl(p.xzy, 0.1+abs(p.y+5.5)*0.03, 3.);
}

float st, flower;
vec3 new_p;
float SDF (vec3 p)
{ 
    mo(p.xz, vec2(1.5));
    p.xz*=rot(p.y*0.5);

    vec3 pp = p+0.3;
    st = stack(pp);

    mo(p.xz,vec2(.5));    
    p.yz *= rot(sin(length(p)-iTime)*2.);    
    mo(p.yz, vec2(0.9));
    mo(p.xy, vec2(0.5));
    new_p = p;
    flower = plane(p, vec3(.2,.2,0.2));

    return min(st,flower);
}

vec3 getcam (vec3 ro, vec3 tar, vec2 uv)
{
    vec3 f = normalize(tar-ro);
    vec3 l = normalize(cross(vec3(0.,1.,0.),f));
    vec3 u = normalize(cross(f,l));
    return normalize(f + uv.x*l + uv.y*u);
}

vec3 getnorm (vec3 p)
{
    vec2 eps = vec2(0.001,0.);
    return normalize(vec3(SDF(p)-vec3(SDF(p-eps.xyy),SDF(p-eps.yxy),SDF(p-eps.yyx))));
}

vec3 palette (float t, vec3 a, vec3 b, vec3 c, vec3 d)
{return a+b*cos(TAU*(c*t+d));}

vec3 background (vec2 uv)
{
    float mask = smoothstep(0.15,0.1,fract(abs(abs(uv.x-uv.y)-0.2)-0.1));
    return (mask >= 0.99) ? vec3(0.8,0.6,0.8) : vec3(0.9);
}

void main()
{
    vec2 uv = (2.*fragCoord-iResolution.xy)/iResolution.y;

    vec3 ro = vec3(2.5,3.,-6.),
        rd = getcam(ro, vec3(0.,-1.5,0.), uv),
        p = ro,
        col = background(uv);

    float shad,d = 0.;
    bool hit = false;

    for (float i=0.; i<64.; i++)
    {
        d = SDF(p * rotation_matrix);
        if (d<0.01)
        {
            hit = true;
            shad = i/64.;
            break;
        }
        p+=d*rd*0.4;
    }

    if (hit)
    {
        if (d == flower) col = palette(length(p),vec3(0.5), vec3(0.4),vec3(0.3), vec3(0.7,0.5,0.3));
        if (d == st) col = vec3(0.5,1.,new_p.y);
        vec3 n = getnorm(p);
        col *= smoothstep(0.15,0.25,pow(abs(n.z), 0.8));
    }

    fragColor = vec4(sqrt(col),1.0);
}