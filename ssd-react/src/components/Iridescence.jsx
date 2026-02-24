import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import { useEffect, useRef, memo } from 'react';
import './Iridescence.css';

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

const Iridescence = memo(({
    color = [1, 1, 1],
    speed = 1.0,
    amplitude = 0.1,
    mouseReact = true,
    renderScale = 0.5, // Downsample resolution for performance
    targetFPS = 30,    // Limit frame rate to save GPU cycles
    ...rest
}) => {
    const ctnDom = useRef(null);
    const mousePos = useRef({ x: 0.5, y: 0.5 });
    const isVisible = useRef(true);
    const isFocused = useRef(true);

    // Create a stable string key for the color array to prevent useEffect re-triggering
    const colorKey = JSON.stringify(color);

    useEffect(() => {
        if (!ctnDom.current) return;
        const ctn = ctnDom.current;
        const renderer = new Renderer();
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0); // Transparent clear color

        let program;

        function resize() {
            renderer.setSize(ctn.offsetWidth * renderScale, ctn.offsetHeight * renderScale, false);
            if (program) {
                program.uniforms.uResolution.value = new Color(
                    gl.canvas.width,
                    gl.canvas.height,
                    gl.canvas.width / gl.canvas.height
                );
            }
        }
        window.addEventListener('resize', resize, false);
        resize();

        const geometry = new Triangle(gl);
        program = new Program(gl, {
            vertex: vertexShader,
            fragment: fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new Color(...JSON.parse(colorKey)) },
                uResolution: {
                    value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height)
                },
                uMouse: { value: new Float32Array([mousePos.current.x, mousePos.current.y]) },
                uAmplitude: { value: amplitude },
                uSpeed: { value: speed }
            }
        });

        const mesh = new Mesh(gl, { geometry, program });
        let animateId;
        let lastTime = 0;
        const interval = 1000 / targetFPS;

        function update(t) {
            animateId = requestAnimationFrame(update);

            // Skip frames if window is not focused or component is not visible
            if (!isVisible.current || !isFocused.current) return;

            const delta = t - lastTime;
            if (delta < interval) return;

            lastTime = t - (delta % interval);

            program.uniforms.uTime.value = t * 0.001;
            renderer.render({ scene: mesh });
        }
        animateId = requestAnimationFrame(update);
        ctn.appendChild(gl.canvas);

        // Visibility Observer
        const observer = new IntersectionObserver(
            ([entry]) => {
                isVisible.current = entry.isIntersecting;
            },
            { threshold: 0 }
        );
        observer.observe(ctn);

        // Focus and Visibility Handlers
        const handleFocus = () => { isFocused.current = true; };
        const handleBlur = () => { isFocused.current = false; };
        const handleVisibilityChange = () => {
            if (document.hidden) isFocused.current = false;
            else if (document.hasFocus()) isFocused.current = true;
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        function handleMouseMove(e) {
            const rect = ctn.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1.0 - (e.clientY - rect.top) / rect.height;
            mousePos.current = { x, y };
            program.uniforms.uMouse.value[0] = x;
            program.uniforms.uMouse.value[1] = y;
        }
        if (mouseReact) {
            ctn.addEventListener('mousemove', handleMouseMove);
        }

        return () => {
            cancelAnimationFrame(animateId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            observer.disconnect();
            if (mouseReact) {
                ctn.removeEventListener('mousemove', handleMouseMove);
            }
            if (gl.canvas && ctn.contains(gl.canvas)) {
                ctn.removeChild(gl.canvas);
            }
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        };
    }, [colorKey, speed, amplitude, mouseReact, renderScale, targetFPS]);

    return <div ref={ctnDom} className="iridescence-container" {...rest} />;
});

export default Iridescence;
