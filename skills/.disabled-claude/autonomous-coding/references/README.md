# Autonomous Coding Agent - Complete Documentation

This directory contains comprehensive documentation for the autonomous coding agent from anthropics/claude-quickstarts.

## Quick Links

- [Main README](../README.md) - Project overview and quick start
- [Security Implementation](../security.py) - Bash command allowlist and validation
- [Agent Logic](../agent.py) - Core agent session management
- [Client Configuration](../client.py) - Claude SDK client setup
- [Project Specification](../prompts/app_spec.txt) - Application requirements
- [Progress Tracking](../progress.py) - Feature implementation tracking

## Key Concepts

### Two-Agent Pattern

1. **Initializer Agent**: Creates project structure and feature list
2. **Coding Agent**: Implements features incrementally

### Session Management

- Fresh context window per session
- Progress persistence via JSON files
- Auto-continuation between sessions
- Safe interruption and resumption

### Security Model

- OS-level sandboxing
- Filesystem restrictions
- Command allowlist
- Defense-in-depth approach

## Getting Started

1. Install dependencies: `pip install -r requirements.txt`
2. Set API key: `export ANTHROPIC_API_KEY='your-key'`
3. Run agent: `python autonomous_agent_demo.py --project-dir ./my-project`

## Expected Timing

- First session: 10-20+ minutes (generating 200 test cases)
- Subsequent sessions: 5-15 minutes per iteration
- Complete application: Many hours total

## Customization

- Edit `prompts/app_spec.txt` for different applications
- Modify `prompts/initializer_prompt.md` to adjust feature count
- Update `security.py` for different command allowances

## Troubleshooting

- First session may appear to hang (generating test cases)
- Watch for `[Tool: ...]` output to confirm activity
- Check security logs if commands are blocked
- Use `--max-iterations` for shorter testing runs
