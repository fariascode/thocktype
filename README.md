# thocktype

Test de mecanografía minimalista en blanco y negro.

- **Modos:** tiempo (15/30/60/120 s), palabras (10/25/50/100), citas con autor, zen (escritura libre, `shift+enter` termina) y texto libre (pega el tuyo)
- **Idiomas:** español, inglés y código, con `@ puntuación` y `# números` opcionales
- **Barra de estado** inferior, estilo editor de código, con toda la configuración
- **Fantasma:** un cursor que corre a la velocidad de tu récord en ese modo
- **Mapa de teclas débiles:** muestra en qué teclas fallas más después de cada test
- **Racha** de días seguidos practicando, e **historial** con gráficas (guardado en tu navegador)
- Cursor suave, sonido *thock* sintetizado, tema claro u oscuro, WPM en vivo
- Métricas: WPM, raw, precisión, consistencia, y caracteres correctos, incorrectos, extra y faltantes

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5280
npm run check   # pruebas de los cálculos
npm run build
```

Atajos: `tab` o `esc` reinician, `ctrl+backspace` borra la palabra.
