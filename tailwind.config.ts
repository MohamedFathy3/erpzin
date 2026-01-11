import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Cairo', 'sans-serif'],
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          light: "hsl(var(--success-light))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
        },
        chart: {
          primary: "hsl(var(--chart-primary))",
          secondary: "hsl(var(--chart-secondary))",
          accent: "hsl(var(--chart-accent))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-md)',
        'floating': 'var(--shadow-lg)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
        "collapse-open": {
          from: { opacity: "0", height: "0", transform: "scaleY(0.95)" },
          to: { opacity: "1", height: "var(--radix-collapsible-content-height)", transform: "scaleY(1)" },
        },
        "collapse-close": {
          from: { opacity: "1", height: "var(--radix-collapsible-content-height)", transform: "scaleY(1)" },
          to: { opacity: "0", height: "0", transform: "scaleY(0.95)" },
        },
        "number-tick": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-100%)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.5)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        // New Glow Animations
        "glow-primary": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--primary) / 0.2), 0 0 10px hsl(var(--primary) / 0.1)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.4), 0 0 40px hsl(var(--primary) / 0.2)" },
        },
        "glow-success": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--success) / 0.2), 0 0 10px hsl(var(--success) / 0.1)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--success) / 0.4), 0 0 40px hsl(var(--success) / 0.2)" },
        },
        "glow-accent": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--accent) / 0.2), 0 0 10px hsl(var(--accent) / 0.1)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--accent) / 0.4), 0 0 40px hsl(var(--accent) / 0.2)" },
        },
        "glow-warning": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--warning) / 0.2), 0 0 10px hsl(var(--warning) / 0.1)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--warning) / 0.4), 0 0 40px hsl(var(--warning) / 0.2)" },
        },
        "glow-destructive": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--destructive) / 0.2), 0 0 10px hsl(var(--destructive) / 0.1)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--destructive) / 0.4), 0 0 40px hsl(var(--destructive) / 0.2)" },
        },
        "glow-info": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--info) / 0.2), 0 0 10px hsl(var(--info) / 0.1)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--info) / 0.4), 0 0 40px hsl(var(--info) / 0.2)" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "hsl(var(--primary) / 0.3)" },
          "50%": { borderColor: "hsl(var(--primary) / 0.8)" },
        },
        "text-glow": {
          "0%, 100%": { textShadow: "0 0 5px hsl(var(--primary) / 0.3)" },
          "50%": { textShadow: "0 0 15px hsl(var(--primary) / 0.6)" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "heartbeat": {
          "0%, 100%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.05)" },
          "50%": { transform: "scale(1)" },
          "75%": { transform: "scale(1.05)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "rotate-glow": {
          "0%": { transform: "rotate(0deg)", filter: "hue-rotate(0deg)" },
          "100%": { transform: "rotate(360deg)", filter: "hue-rotate(360deg)" },
        },
        "ripple": {
          "0%": { transform: "scale(0)", opacity: "0.5" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s ease-out",
        "accordion-up": "accordion-up 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "collapse-open": "collapse-open 0.3s ease-out",
        "collapse-close": "collapse-close 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        // New animations
        "glow-primary": "glow-primary 2s ease-in-out infinite",
        "glow-success": "glow-success 2s ease-in-out infinite",
        "glow-accent": "glow-accent 2s ease-in-out infinite",
        "glow-warning": "glow-warning 2s ease-in-out infinite",
        "glow-destructive": "glow-destructive 2s ease-in-out infinite",
        "glow-info": "glow-info 2s ease-in-out infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        "text-glow": "text-glow 2s ease-in-out infinite",
        "bounce-soft": "bounce-soft 2s ease-in-out infinite",
        "wiggle": "wiggle 0.3s ease-in-out",
        "heartbeat": "heartbeat 1.5s ease-in-out infinite",
        "gradient-shift": "gradient-shift 3s ease infinite",
        "rotate-glow": "rotate-glow 8s linear infinite",
        "ripple": "ripple 0.6s linear",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
