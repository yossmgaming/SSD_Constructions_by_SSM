export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    corePlugins: {
        preflight: false, // Prevents tailwind from rewriting base styles breaking custom design
    },
    plugins: [],
}
