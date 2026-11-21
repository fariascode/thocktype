# thocktype

Test de mecanografía minimalista en blanco y negro.

**Pruébala:** https://thocktype-alpha.vercel.app

- **Modos:** tiempo (15/30/60/120 s), palabras (10/25/50/100), citas con autor, zen (escritura libre, `shift+enter` termina) y texto libre (pega el tuyo)
- **Idiomas:** español e inglés (~1,100 palabras cada uno) y código (JS, Python, SQL, CSS, shell), con `@ puntuación` y `# números` opcionales
- **Barra de estado** inferior, estilo editor de código, con toda la configuración
- **Fantasma:** un cursor que corre a la velocidad de tu récord en ese modo
- **Mapa de teclas débiles:** muestra en qué teclas fallas más, tanto en cada test como en todo tu historial
- **Reto diario:** el mismo texto para todos cada día, un intento oficial, racha de retos, resultado en cuadrícula ■□ para compartir y **ranking del día** con tu posición
- **Paleta de comandos** (`ctrl+k`): todo se controla desde el teclado con búsqueda que ignora acentos
- **Reglas** combinables: sin borrar, ciego, frenar en error y muerte súbita
- **Coach:** mide el tiempo entre cada par de letras, te dice cuáles te frenan (p. ej. «qu» 2.1× más lenta) y genera práctica con ellas
- **Modo práctica:** genera palabras cargadas de tus teclas débiles para que las entrenes
- **Récords personales** por modo (15/30/60/120 s y 10/25/50/100 palabras) con wpm, precisión, raw y consistencia, filtrables por idioma y por puntuación/números, más totales: tests, tiempo escribiendo, wpm más alto, promedios
- **Nivel de cuenta:** cada test da xp (≈ caracteres correctos + bono, el reto oficial vale doble); el nivel sube con una curva suave, con títulos cada 10 niveles (novato → leyenda). Se calcula del historial, así que se sincroniza solo y aparece en tu perfil público
- **Racha** de días seguidos practicando, con racha más larga y un **calendario de actividad** de 6 meses
- **Historial** con gráficas, guardado en tu navegador y sincronizado en la nube entre tus dispositivos al iniciar sesión (funciona sin conexión y sube lo pendiente después)
- Funciona en celular y tablet con el teclado táctil
- **Compartir** tu resultado como imagen en blanco y negro (menú nativo en celular, descarga en PC) o como texto
- **Cuentas:** Google, enlace por correo o correo y contraseña (Supabase)
- **Perfiles públicos** en `/u/usuario`: foto, bio, récords, calendario, progreso, coach y teclado; se pueden hacer privados
- **Instalable (PWA)** y funciona sin internet después de la primera visita
- **Ajustes ⚙** por dispositivo: tamaño del texto, líneas visibles (2/3/4), ancho (estrecho/normal/ancho), 6 fuentes (Cascadia Code es la insignia), 4 estilos de cursor y 13 temas: 5 monocromáticos (carbón, claro, papel, tinta, alto contraste) y 8 de color (lila y lavanda propios, más Catppuccin, Rosé Pine, Nord, Gruvbox, Tokyo Night y Everforest), todos verificados con contraste WCAG
- Aviso de **Bloq Mayús** activado mientras escribes
- Cursor suave, sonido *thock* sintetizado, WPM en vivo
- Métricas: WPM, raw, precisión, consistencia, y caracteres correctos, incorrectos, extra y faltantes

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5280
npm run check   # pruebas de los cálculos
npm run build
```

Atajos: `tab` o `esc` reinician, `ctrl+backspace` borra la palabra, `ctrl+k` abre la paleta de comandos.
