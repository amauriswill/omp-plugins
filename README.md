# 🚀 omp-plugins

Suite de plugins, extensiones y comandos avanzados para **[omp](https://omp.sh)**. Diseñada para potenciar flujos de desarrollo, telemetría en tiempo real, optimización de tokens y automatización de tareas.

Compatible de forma nativa en **Windows**, **macOS** y **Linux**.

---

## 📑 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Catálogo de Plugins](#-catálogo-de-plugins)
  - [1. Commit (`/commit`)](#1-commit-commit)
  - [2. Think Hard (`+ <prompt>`)](#2-think-hard---prompt)
  - [3. Use Smol (`_ <prompt>`)](#3-use-smol---prompt)
  - [4. Token Meter (`/tokens`)](#4-token-meter-tokens)
  - [5. Sub Meter (`/sub-meter`)](#5-sub-meter-sub-meter)
  - [6. After Queue (`/after`)](#6-after-queue-after)
  - [7. Image Preview (`/preview-image`)](#7-image-preview-preview-image)
- [Instalación](#-instalación)
  - [Método 1: Instalación Rápida con Script (Recomendado)](#método-1-instalación-rápida-con-script-recomendado)
  - [Método 2: Marketplace Oficial](#método-2-marketplace-oficial)
  - [Método 3: Enlace Directo (Desarrollo Local)](#método-3-enlace-directo-desarrollo-local)
- [Matriz de Compatibilidad Multiplataforma](#-matriz-de-compatibilidad-multiplataforma)
- [Estructura del Repositorio](#-estructura-del-repositorio)
- [Licencia](#-licencia)

---

## ✨ Características Principales

- **Multiplataforma Real**: Probado y garantizado en Windows 10/11, macOS (Apple Silicon e Intel) y Linux.
- **Sin Dependencias Nativas Pesadas**: Desarrollado en TypeScript modular aprovechando APIs nativas del sistema operativo (`node:zlib`, `sips`, PowerShell `System.Drawing`, ImageMagick/ffmpeg).
- **Integración TUI en Tiempo Real**: Notificaciones dinámicas, barras de estado en el footer (`ctx.ui.setStatus`) e interacción en la línea de comandos.
- **Alineado con el Estándar de omp**: Registrado como Marketplace compatible con `.omp-plugin/marketplace.json` y `.claude-plugin/marketplace.json`.

---

## 📦 Catálogo de Plugins

| Plugin | Tipo | Activador / Comando | Descripción | Plataformas |
| :--- | :--- | :--- | :--- | :--- |
| **Commit** | Comando & Extensión | `/commit` | Commits semánticos basados en Conventional Commits con flujo interactivo de push y ramas. | Windows · macOS · Linux |
| **Think Hard** | Extensión & Hook | `+ <prompt>` o `/think-hard` | Eleva el razonamiento a `max` para un único turno y restaura el nivel anterior automáticamente. | Windows · macOS · Linux |
| **Use Smol** | Extensión & Hook | `_ <prompt>` o `/use-smol` | Delega el turno actual a un modelo ligero y veloz (`@smol`, Haiku o Flash) para ahorrar costos. | Windows · macOS · Linux |
| **Token Meter** | Extensión & Telemetría | Barra de estado y `/tokens` | Medición en tiempo real de tokens de entrada (`↑`), salida (`↓`), caché (`c:`) y acumulado (`Σ`). | Windows · macOS · Linux |
| **Sub Meter** | Extensión & Telemetría | Barra de estado y `/sub-meter` | Rastreo visual con barras de progreso de ventanas de tarifa (5h / 7d) y tiempos de reinicio. | Windows · macOS · Linux |
| **After** | Comando & Cola | `/after <tarea>`, `/before` | Cola de prompts pendientes que se ejecutan automáticamente en cuanto el agente queda libre. | Windows · macOS · Linux |
| **Image Preview** | Herramienta & Comando | `/preview-image`, `/open-image` | Ventana flotante sin bordes junto al puntero sin perder foco de terminal, y visor del sistema. | Windows · macOS · Linux |

---

## 🔍 Detalle de Cada Plugin

### 1. Commit (`/commit`)

Automatiza la preparación de commits limpios y semánticos a partir del estado de Git (`git status --short` y `git diff HEAD`).

**Flujo interactivo:**
1. Pregunta la estrategia deseada:
   - **Commit + push (Recomendado)**: Realiza los commits en la rama actual y empuja al remoto (`origin HEAD`).
   - **Commit only**: Realiza los commits locales sin publicar.
   - **Commit on a new branch**: Crea una rama descriptiva (`type/nombre-corto`), commitea y empuja.
2. Agrupa los archivos modificados en cambios lógicos independientes.
3. Aplica la especificación **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `test:`, `chore:`.
4. Protege tus credenciales: nunca añade archivos `.env*` ni secrets.

```text
> /commit
```

---

### 2. Think Hard (`+ <prompt>`)

Optimiza el uso de modelos de razonamiento (como Claude 3.7 Sonnet con Extended Thinking, o Gemini Thinking). En lugar de mantener el razonamiento al máximo constantemente, actívalo solo cuando lo necesites.

**Uso:**
Comienza cualquier instrucción con el prefijo `+`:
```text
+ demuestra matemáticamente la complejidad temporal de esta solución recursiva
```

**Comportamiento:**
1. Detecta y remueve el prefijo `+`.
2. Guarda el nivel actual de pensamiento y configura `pi.setThinkingLevel("max")`.
3. Muestra el estado activo en la consola: `🧠 Think Hard: MAX`.
4. Al finalizar la respuesta del modelo, restaura automáticamente tu configuración habitual.

También puedes ajustar o consultar los niveles manualmente:
```text
/think-hard max
/think-hard auto
/think-hard off
```

---

### 3. Use Smol (`_ <prompt>`)

Ahorra tokens y reduce la latencia en tareas cotidianas (resúmenes rápidos, explicaciones cortas, formateo de datos) delegándolas a un modelo compacto (`@smol`, `claude-haiku`, `gemini-flash` o `gpt-4o-mini`).

**Uso:**
Comienza cualquier instrucción con el prefijo `_`:
```text
_ traduce este array de cadenas a JSON en español
```

**Comportamiento:**
1. Detecta el prefijo `_` (ignorando nombres de archivos de código como `__init__.py`).
2. Conmuta temporalmente la sesión al modelo ligero configurado.
3. Informa en la barra inferior: `⚡ Smol: <nombre-del-modelo>`.
4. Restaura el modelo principal inmediatamente después del turno.

---

### 4. Token Meter (`/tokens`)

Telemetría precisa e inmediata en el footer del TUI de `omp`. Muestra el desglose de consumo del último turno y el total acumulado de la sesión de trabajo.

**Vista en la barra inferior:**
```text
📊 ↑ 1.4k · ↓ 340 · c: 4.8k | Σ 14.2k
```
- `↑`: Tokens de entrada del turno (prompt tokens).
- `↓`: Tokens generados (completion tokens).
- `c:`: Tokens recuperados o creados en caché de contexto.
- `Σ`: Suma total acumulada en la sesión activa.

**Comando `/tokens`:**
Genera un informe detallado con porcentaje de ahorro por caché:
```markdown
### 📊 Session Token Metrics

| Metric | Last Turn | Session Total |
| :--- | :--- | :--- |
| **Input** | 1,420 | 11,250 |
| **Output** | 340 | 2,950 |
| **Cache Read/Creation** | 4,810 | 38,400 |
| **Total Tokens** | 1,760 | 14,200 |

- **Turns elapsed**: 6
- **Cache hit rate**: 77.3%
```

---

### 5. Sub Meter (`/sub-meter`)

Rastrea en tiempo real el consumo de tus cuotas de suscripción de proveedores (ventanas de 5 horas y 7 días).

**Vista en la barra inferior:**
```text
⏳ 5h [████░░░░] 40% (~3h)
```

**Comando `/sub-meter`:**
Renderiza una tarjeta visual con barras de caracteres de bloque y cuenta regresiva de reseteo:
```text
┌─ [ RATE LIMITS & QUOTA ] ─────────────────────────────────────┐
│ • 5h Limit         [████████░░░░░░░░]   40%  resets ~3h       │
│ • 7d Limit         [████░░░░░░░░░░░░]   20%  resets ~5d       │
└───────────────────────────────────────────────────────────────┘
```

---

### 6. After Queue (`/after`)

Permite mantener un flujo de trabajo continuo sin esperar a que el modelo termine de generar código o ejecutar comandos largos. Encola tus siguientes requerimientos sin interrumpir ni desviar la generación activa (*no-steering*).

**Comandos disponibles:**
- `/after <prompt>`: Añade una tarea al final de la cola.
- `/before <prompt>`: Inserta una tarea prioritaria al principio de la cola.
- `/after`: Muestra todas las tareas pendientes y su posición.
- `/after clear`: Limpia la cola por completo.
- `/after run`: Fuerza la ejecución inmediata de la siguiente tarea si el agente está libre.

**Ejemplo:**
Mientras el asistente ejecuta una suite de pruebas o refactoriza un módulo:
```text
/after añade documentación de API Swagger en docs/openapi.yaml
/after prepara los cambios y ejecuta /commit
```
Las tareas se marcan en la barra de estado (`📋 Queue (2)`) y se despachan de forma secuencial una vez concluida cada etapa.

---

### 7. Image Preview (`/preview-image`, `/open-image`)

Abre una ventana flotante y sin bordes con la imagen en resolución nítida y proporción real **directamente junto al cursor del ratón, fuera de la terminal**, sin robar el foco del teclado ni interrumpir lo que estás escribiendo.

**Comportamiento de la ventana:**
- **No roba foco ni activación**: Puedes continuar escribiendo comandos en la terminal mientras la imagen flota junto al puntero.
- **Alineación inteligente**: Se posiciona automáticamente arriba/abajo o a los lados del cursor para nunca tapar el puntero ni salirse de la pantalla.
- **Nativa en cada sistema operativo**:
  - **macOS**: Panel AppKit HUD con esquinas redondeadas y material traslúcido vía `osascript` (JXA).
  - **Windows**: Ventana de herramientas sin bordes (`WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TRANSPARENT`) vía PowerShell `System.Windows.Forms`.
  - **Linux**: Ventana tooltip ligera sobre X11 vía Python `tkinter`.

**Comandos:**
```text
/preview-image ruta/a/captura.png    # Abre la ventana flotante junto al puntero
/open-image ruta/a/captura.png       # Abre en el visor predeterminado del sistema (Preview / Fotos / xdg-open)
/close-preview                       # Cierra la ventana flotante activa
```

**Herramienta para el modelo:**
El asistente dispone de la herramienta `preview_image` con acciones `"preview"` (abrir ventana flotante), `"open"` (abrir en el visor del sistema) y `"close"`.

## 📥 Instalación

### Método 1: Instalación Rápida con Script (Recomendado)

Clona o descarga este repositorio:
```bash
git clone https://github.com/amauriswill/omp-plugins.git
cd omp-plugins
```

**En Windows (PowerShell):**
```powershell
.\install.ps1
```

**En macOS o Linux (Bash):**
```bash
chmod +x install.sh
./install.sh
```

El script registrará automáticamente el marketplace local e instalará los 7 plugins en el perfil de usuario.

---

### Método 2: Marketplace Oficial

Puedes registrar el repositorio directamente en tu instalación de `omp`:

```bash
# Desde el directorio local clonado:
omp plugin marketplace add .

# O indicando la ruta absoluta:
omp plugin marketplace add "/ruta/a/omp-plugins"
```

Luego instala los plugins que necesites:
```bash
omp plugin install commit@omp-plugins
omp plugin install think-hard@omp-plugins
omp plugin install use-smol@omp-plugins
omp plugin install token-meter@omp-plugins
omp plugin install sub-meter@omp-plugins
omp plugin install after@omp-plugins
omp plugin install image-preview@omp-plugins
```

Para verificar las instalaciones:
```bash
omp plugin list
```

---

### Método 3: Enlace Directo (Desarrollo Local)

Si estás modificando el código de un plugin y deseas recargar cambios al instante sin reinstalar:
```bash
omp plugin link ./plugins/commit
omp plugin link ./plugins/think-hard
omp plugin link ./plugins/use-smol
omp plugin link ./plugins/token-meter
omp plugin link ./plugins/sub-meter
omp plugin link ./plugins/after
omp plugin link ./plugins/image-preview
```

---

## 🌐 Matriz de Compatibilidad Multiplataforma

| Plugin | Windows 10 / 11 | macOS (Intel & Apple Silicon) | Linux (Ubuntu, Debian, Fedora, Arch) |
| :--- | :---: | :---: | :---: |
| **commit** | ✅ Probado (`git.exe`) | ✅ Probado (`git`) | ✅ Probado (`git`) |
| **think-hard** | ✅ Nativo (In-process TS) | ✅ Nativo (In-process TS) | ✅ Nativo (In-process TS) |
| **use-smol** | ✅ Nativo (In-process TS) | ✅ Nativo (In-process TS) | ✅ Nativo (In-process TS) |
| **token-meter** | ✅ Nativo (In-process TS) | ✅ Nativo (In-process TS) | ✅ Nativo (In-process TS) |
| **sub-meter** | ✅ Probado (`omp usage`) | ✅ Probado (`omp usage`) | ✅ Probado (`omp usage`) |
| **after** | ✅ Nativo (Lifecycle Hooks) | ✅ Nativo (Lifecycle Hooks) | ✅ Nativo (Lifecycle Hooks) |
| **image-preview** | ✅ Ventana flotante WinForms (PowerShell) | ✅ Panel HUD AppKit (`osascript`) | ✅ Tooltip X11 (`tkinter`) |

---

## 📁 Estructura del Repositorio

```text
omp-plugins/
├── .omp-plugin/
│   └── marketplace.json       # Definición de catálogo para omp
├── .claude-plugin/
│   └── marketplace.json       # Compatibilidad con claude marketplace
├── package.json               # Monorepo Workspace
├── README.md                  # Documentación principal
├── install.ps1                # Script automatizado PowerShell
├── install.sh                 # Script automatizado Bash
└── plugins/
    ├── commit/                # /commit + conventional commits
    ├── think-hard/            # Prefijo '+' razonamiento máximo
    ├── use-smol/              # Prefijo '_' delegación a modelos rápidos
    ├── token-meter/           # Telemetría de tokens en tiempo real
    ├── sub-meter/             # Medidor de cuotas y resets
    ├── after/                 # Cola no intrusiva de tareas
    └── image-preview/         # Previsualizador terminal de imágenes
```

---

## 📄 Licencia

Distribuido bajo la Licencia **MIT**. Consulta `LICENSE` para más detalles.
