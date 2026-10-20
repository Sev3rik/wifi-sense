<div align="center">

# 📡 wifi-sense

**Detecta movimiento y cercanía usando la señal WiFi de tu router, desde Windows.**

![Windows 11](https://img.shields.io/badge/Windows-11-0078D6?logo=windows&logoColor=white)
![Node](https://img.shields.io/badge/Node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Router](https://img.shields.io/badge/Probado%20con-TP--Link%20Archer%20AX23-4ACBD6)

</div>

---

## ✨ Qué hace

- 📈 Gráfico en vivo de la intensidad de la señal (RSSI, en dBm) entre tu PC y el router.
- 🚶 Indicador de **movimiento / quieto** según cuánto fluctúa la señal.
- 📍 Estimación aproximada de **qué tan cerca** está tu PC del router.
- 🔔 **Alerta sonora** al empezar el movimiento (se puede silenciar).
- 🎚️ Umbral ajustable y botón de **calibración** con la habitación vacía.

## 🚀 Uso rápido

```powershell
git clone <este-repo>
cd wifi-sense
npm install
npm run dev
```

Se abre `http://localhost:5173`. Tu PC tiene que estar conectado por **WiFi** (no por cable) al Archer AX23.

¿Sin WiFi o en otro sistema? `npm run demo` usa datos simulados.

## 🧠 Cómo funciona

```mermaid
flowchart LR
  R[📶 Archer AX23] -- ondas WiFi --> P[💻 Tu PC]
  P -- netsh wlan show interfaces<br/>cada 0,5 s --> S[Node server :8787]
  S -- WebSocket --> W[🌐 App web :5173]
```

Cuando una persona se mueve entre el router y el PC, su cuerpo absorbe y refleja la señal, y el RSSI fluctúa. La app mide la desviación estándar de las últimas ~5 s: si supera el umbral, marca **movimiento**.

## 🎯 Consejos

1. Pon el PC a 2–5 m del router, con el espacio a vigilar **entre ambos**.
2. Pulsa **Calibrar** con la habitación vacía y quieta.
3. La banda de 5 GHz suele reaccionar más al movimiento que la de 2,4 GHz.

## 📐 ¿Distinguir a una persona por su altura?

Con un solo enlace RSSI no se puede medir la altura, porque la señal no trae ángulo ni distancia al objeto. Lo que sí sirve es la geometría de la **zona de Fresnel**: la señal viaja por un "huso" alrededor de la línea router–PC, de radio

$$ r = \sqrt{\frac{\lambda \, d_1 d_2}{d_1 + d_2}} $$

A 5 GHz (λ ≈ 6 cm) y con 4 m entre equipos, el radio en el centro es de unos **24 cm**. Si pones el router y el PC a **~1,4 m de altura**, el huso queda entre ~1,15 y 1,65 m: lo cruza el torso de un adulto (como alguien de 1,83 m), pero no una mascota ni una silla. Es un filtro físico, no una identificación.

## ⚠️ Límites (léelo)

| Puede | No puede |
|---|---|
| Detectar si alguien se mueve cerca de la línea router–PC | Saber **dónde** estás en la habitación |
| Dar una idea de cerca / lejos del router | Contar personas o ver a través de varias paredes con precisión |

- El firmware de fábrica del AX23 **no expone CSI** (Channel State Information), que es lo que usa el "WiFi sensing" de verdad. Con solo RSSI la precisión es limitada.
- Windows actualiza la señal cada cierto tiempo y la redondea, así que la detección tiene algo de retardo.
- El ruido de otras redes y aparatos puede dar falsos positivos: ajusta el umbral.

## 🔭 Siguiente nivel

Para posición real: 2 o 3 placas **ESP32** (~US$5 c/u) con [ESP32-CSI-Tool](https://github.com/StevenMHernandez/ESP32-CSI-Tool) y triangulación.

## 📁 Estructura

```
wifi-sense/
├── server/index.js   # Lee netsh y emite por WebSocket
├── src/main.js       # Detección + gráfico
├── src/style.css
├── index.html
└── vite.config.js
```

