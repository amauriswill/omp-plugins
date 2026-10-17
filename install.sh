#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "=========================================="
echo "  Instalando suite omp-plugins para OMP   "
echo "=========================================="

echo -e "\n1. Registrando marketplace local ($DIR)..."
omp plugin marketplace add "$DIR"

PLUGINS=(
  "commit"
  "think-hard"
  "use-smol"
  "token-meter"
  "sub-meter"
  "after"
  "image-preview"
)

echo -e "\n2. Instalando plugins..."
for p in "${PLUGINS[@]}"; do
  echo "   -> Instalando ${p}@omp-plugins..."
  omp plugin install "${p}@omp-plugins" || omp plugin link "$DIR/plugins/$p"
done

echo -e "\n3. Instalando tema visual Alacritty..."
mkdir -p "$HOME/.omp/agent/themes"
cp "$DIR/themes/alacritty.json" "$HOME/.omp/agent/themes/alacritty.json"
echo "   -> Tema alacritty instalado en $HOME/.omp/agent/themes/alacritty.json"

echo -e "\n4. Estado actual de plugins:"
omp plugin list

echo "=========================================="
echo "  Instalación completada con éxito.       "
echo "=========================================="
