#!/usr/bin/env python3
"""
Auto-commit script con messaggi generati da AI
Uso: python auto-commit.py [--interval MINUTI] [--provider claude|ollama]
"""

import subprocess
import sys
import time
import argparse
from datetime import datetime


def get_git_diff():
    """Ottiene le differenze tra working directory e ultimo commit"""
    try:
        # Controlla se ci sono modifiche
        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            capture_output=True,
            text=True,
            check=True
        )

        if not result.stdout.strip():
            return None  # Nessuna modifica

        # Ottiene diff dettagliato
        diff = subprocess.run(
            ['git', 'diff', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )

        # Ottiene lista file modificati
        status = subprocess.run(
            ['git', 'status', '--short'],
            capture_output=True,
            text=True,
            check=True
        )

        return {
            'diff': diff.stdout,
            'status': status.stdout,
            'files': result.stdout
        }
    except subprocess.CalledProcessError as e:
        print(f"❌ Errore git: {e}")
        return None


def generate_commit_message_claude(diff_data):
    """Genera messaggio commit usando Claude API"""
    try:
        import anthropic
        import os

        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            print("❌ ANTHROPIC_API_KEY non trovata nelle variabili d'ambiente")
            return None

        client = anthropic.Anthropic(api_key=api_key)

        prompt = f"""Analizza queste modifiche git e genera un messaggio di commit conciso in italiano.

File modificati:
{diff_data['status']}

Differenze:
{diff_data['diff'][:3000]}

Regole:
- Massimo 1-2 righe
- Descrivi COSA è cambiato e PERCHÉ
- Usa verbi al passato ("aggiunto", "modificato", "corretto")
- Sii specifico ma conciso
- NO emoji, NO prefissi tipo "feat:", solo testo

Rispondi SOLO con il messaggio di commit, nient'altro."""

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )

        return message.content[0].text.strip()

    except ImportError:
        print("❌ Installa: pip install anthropic")
        return None
    except Exception as e:
        print(f"❌ Errore Claude API: {e}")
        return None


def generate_commit_message_ollama(diff_data):
    """Genera messaggio commit usando Ollama (locale)"""
    try:
        import requests

        prompt = f"""Analizza queste modifiche git e genera un messaggio di commit conciso in italiano.

File modificati:
{diff_data['status']}

Differenze:
{diff_data['diff'][:3000]}

Regole:
- Massimo 1-2 righe
- Descrivi COSA è cambiato e PERCHÉ
- Usa verbi al passato ("aggiunto", "modificato", "corretto")
- Sii specifico ma conciso
- NO emoji, NO prefissi tipo "feat:", solo testo

Rispondi SOLO con il messaggio di commit, nient'altro."""

        response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                'model': 'qwen2.5-coder',  # o 'mistral', 'codellama', ecc.
                'prompt': prompt,
                'stream': False
            },
            timeout=30
        )

        if response.status_code == 200:
            return response.json()['response'].strip()
        else:
            print(f"❌ Errore Ollama: {response.status_code}")
            return None

    except ImportError:
        print("❌ Installa: pip install requests")
        return None
    except requests.exceptions.ConnectionError:
        print("❌ Ollama non in esecuzione. Avvia con: ollama serve")
        return None
    except Exception as e:
        print(f"❌ Errore Ollama: {e}")
        return None


def do_commit_and_push(message):
    """Esegue add, commit e push"""
    try:
        # Git add
        subprocess.run(['git', 'add', '.'], check=True)

        # Git commit
        subprocess.run(['git', 'commit', '-m', message], check=True)

        # Git push
        result = subprocess.run(
            ['git', 'push'],
            capture_output=True,
            text=True,
            check=True
        )

        return True

    except subprocess.CalledProcessError as e:
        print(f"❌ Errore durante commit/push: {e}")
        if e.stderr:
            print(e.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description='Auto-commit con AI')
    parser.add_argument(
        '--interval',
        type=int,
        default=30,
        help='Intervallo in minuti tra i commit (default: 30)'
    )
    parser.add_argument(
        '--provider',
        choices=['claude', 'ollama'],
        default='claude',
        help='Provider AI da usare (default: claude)'
    )
    parser.add_argument(
        '--once',
        action='store_true',
        help='Esegui una sola volta e termina'
    )

    args = parser.parse_args()

    print(f"🤖 Auto-commit attivo (provider: {args.provider})")
    print(f"⏱️  Intervallo: {args.interval} minuti")
    print(f"📁 Directory: {subprocess.run(['pwd'], capture_output=True, text=True).stdout.strip()}")
    print("-" * 50)

    iteration = 0

    while True:
        iteration += 1
        timestamp = datetime.now().strftime("%H:%M:%S")

        print(f"\n[{timestamp}] 🔍 Controllo modifiche... (#{iteration})")

        # Controlla modifiche
        diff_data = get_git_diff()

        if not diff_data:
            print("   ℹ️  Nessuna modifica da committare")
        else:
            print("   ✅ Modifiche rilevate!")
            print(f"   📝 File modificati:\n{diff_data['status']}")

            # Genera messaggio
            if args.provider == 'claude':
                commit_msg = generate_commit_message_claude(diff_data)
            else:
                commit_msg = generate_commit_message_ollama(diff_data)

            if commit_msg:
                print(f"\n   💬 Messaggio generato:")
                print(f"   \"{commit_msg}\"")

                # Commit & Push
                if do_commit_and_push(commit_msg):
                    print(f"   ✅ Commit & push completati!")
                else:
                    print(f"   ❌ Errore durante commit/push")
            else:
                print("   ⚠️  Impossibile generare messaggio, uso fallback")
                fallback_msg = f"Auto-commit: modifiche del {datetime.now().strftime('%Y-%m-%d %H:%M')}"
                if do_commit_and_push(fallback_msg):
                    print(f"   ✅ Commit con messaggio fallback completato")

        if args.once:
            print("\n✅ Esecuzione singola completata")
            break

        # Attendi prossimo ciclo
        wait_seconds = args.interval * 60
        print(f"\n⏳ Prossimo controllo tra {args.interval} minuti...")
        time.sleep(wait_seconds)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Auto-commit interrotto dall'utente")
        sys.exit(0)
