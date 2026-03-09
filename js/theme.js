/**
 * Theme System - Projeto V01
 * Gerencia as cores e o tema dinâmico baseado no perfil do usuário.
 */

(function () {
    // Cores por Perfil
    const themeColors = {
        'Admin': {
            primary: '#F59E0B', // Âmbar / Laranja
            background: '#05070A' // Dark profundo
        },
        'Gestor': {
            primary: '#10B981', // Esmeralda / Verde
            background: '#101622' // Dark padrão
        },
        'Funcionário': {
            primary: '#0d59f2', // Azul
            background: '#101622' // Dark padrão
        }
    };

    // Recupera o papel do usuário logado
    const userRole = localStorage.getItem('userRole') || 'Funcionário';
    const config = themeColors[userRole] || themeColors['Funcionário'];

    // Configuração Global do Tailwind
    window.tailwind = window.tailwind || {};
    window.tailwind.config = {
        darkMode: "class",
        theme: {
            extend: {
                colors: {
                    "primary": config.primary,
                    "background-light": "#f5f6f8",
                    "background-dark": config.background,
                },
                fontFamily: {
                    "display": ["Space Grotesk"]
                },
                borderRadius: { "DEFAULT": "0.5rem", "lg": "1rem", "xl": "1.5rem", "full": "9999px" },
            },
        },
    };

    // Injetar variáveis CSS para componentes que usam cores puras
    document.documentElement.style.setProperty('--primary-color', config.primary);
    document.documentElement.style.setProperty('--background-dark', config.background);

    console.log(`[Theme] Perfil: ${userRole} | Tema aplicado com sucesso.`);
})();
