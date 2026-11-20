# thocktype

Test de mecanografía minimalista en blanco y negro.

- **Modos:** tiempo (15/30/60/120 s), palabras (10/25/50/100), citas con autor, zen (escritura libre, `shift+enter` termina) y texto libre (pega el tuyo)
- **Idiomas:** español e inglés (~1,100 palabras cada uno) y código (JS, Python, SQL, CSS, shell), con `@ puntuación` y `# números` opcionales
- **Barra de estado** inferior, estilo editor de código, con toda la configuración
- **Fantasma:** un cursor que corre a la velocidad de tu récord en ese modo
- **Mapa de teclas débiles:** muestra en qué teclas fallas más, tanto en cada test como en todo tu historial
- **Reto diario:** el mismo texto para todos cada día, un intento oficial, racha de retos y resultado en cuadrícula ■□ para compartir
- **Paleta de comandos** (`ctrl+k`): todo se controla desde el teclado con búsqueda que ignora acentos
- **Reglas** combinables: sin borrar, ciego, frenar en error y muerte súbita
- **Coach:** mide el tiempo entre cada par de letras, te dice cuáles te frenan (p. ej. «qu» 2.1× más lenta) y genera práctica con ellas
- **Modo práctica:** genera palabras cargadas de tus teclas débiles para que las entrenes
- **Racha** de días seguidos practicando, con racha más larga y un **calendario de actividad** de 6 meses
- **Historial** con gráficas (guardado en tu navegador)
- Funciona en celular y tablet con el teclado táctil
- **Compartir** tu resultado como imagen en blanco y negro (menú nativo en celular, descarga en PC) o como texto
- **Instalable (PWA)** y funciona sin internet después de la primera visita
- Cursor suave, sonido *thock* sintetizado, tema claro u oscuro, WPM en vivo
- Métricas: WPM, raw, precisión, consistencia, y caracteres correctos, incorrectos, extra y faltantes

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5280
npm run check   # pruebas de los cálculos
npm run build
```

Atajos: `tab` o `esc` reinician, `ctrl+backspace` borra la palabra, `ctrl+k` abre la paleta de comandos.
