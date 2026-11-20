# thocktype

Test de mecanografía minimalista en blanco y negro.

- **Test por tiempo** de 15, 30, 60 y 120 s, en español, inglés y código, con mayúsculas, puntuación y números opcionales (`@ #`)
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
