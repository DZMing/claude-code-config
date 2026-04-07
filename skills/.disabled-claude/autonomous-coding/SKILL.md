---
name: autonomous-coding-agent
description: Claude autonomous coding agent for building complete applications with long-running sessions
---

# Autonomous Coding Agent

**Repository:** [anthropics/claude-quickstarts](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding)
**License:** Internal Anthropic use
**Technology:** Python with Claude Agent SDK

## Overview

A minimal harness demonstrating long-running autonomous coding with the Claude Agent SDK. This demo implements a two-agent pattern (initializer + coding agent) that can build complete applications over multiple sessions.

## When to Use This Skill

Use this skill when you need to:

- Build complete applications from specifications
- Implement long-running coding projects with multiple sessions
- Understand autonomous agent patterns for coding
- Create applications that require complex feature implementation
- Handle large-scale software development with AI assistance

## Key Features

### Two-Agent Pattern

1. **Initializer Agent (Session 1):** Reads `app_spec.txt`, creates `feature_list.json` with 200 test cases, sets up project structure, and initializes git.
2. **Coding Agent (Sessions 2+):** Picks up where the previous session left off, implements features one by one, and marks them as passing in `feature_list.json`.

### Security Model

- **OS-level Sandbox:** Bash commands run in an isolated environment
- **Filesystem Restrictions:** File operations restricted to the project directory only
- **Bash Allowlist:** Only specific permitted commands (file inspection, Node.js, git, process management)
- **Defense-in-depth:** Security hooks block unauthorized commands

### Session Management

- Each session runs with a fresh context window
- Progress is persisted via `feature_list.json` and git commits
- Auto-continuation between sessions (3 second delay)
- Resume capability with `Ctrl+C` interruption

## Quick Start

### Prerequisites

```bash
# Install Claude Code CLI (latest version required)
npm install -g @anthropic-ai/claude-code

# Install Python dependencies
pip install -r requirements.txt

# Set API key
export ANTHROPIC_API_KEY='your-api-key-here'
```

### Basic Usage

```bash
# Start autonomous coding (unlimited iterations)
python autonomous_agent_demo.py --project-dir ./my_project

# Limited iterations for testing
python autonomous_agent_demo.py --project-dir ./my_project --max-iterations 3
```

### Expected Timing

**⚠️ Important:** This demo takes significant time to run:

- **First session (initialization):** Several minutes to generate 200 test cases
- **Subsequent sessions:** 5-15 minutes per iteration
- **Full app:** Many hours for all 200 features

## Architecture Overview

### Core Components

| Component                  | Purpose                               | Key Features                              |
| -------------------------- | ------------------------------------- | ----------------------------------------- |
| `autonomous_agent_demo.py` | Main entry point                      | Command line interface, iteration control |
| `agent.py`                 | Agent session logic                   | Two-agent pattern, session management     |
| `client.py`                | Claude SDK client configuration       | Security settings, tool integration       |
| `security.py`              | Bash command allowlist and validation | OS sandbox, command filtering             |
| `progress.py`              | Progress tracking utilities           | Feature status, session summaries         |
| `prompts.py`               | Prompt loading utilities              | Template management, spec copying         |

### Project Structure

```
autonomous-coding/
├── autonomous_agent_demo.py  # Main entry point
├── agent.py                  # Agent session logic
├── client.py                 # Claude SDK client configuration
├── security.py               # Bash command allowlist and validation
├── progress.py               # Progress tracking utilities
├── prompts.py                # Prompt loading utilities
├── prompts/
│   ├── app_spec.txt          # Application specification
│   ├── initializer_prompt.md # First session prompt
│   └── coding_prompt.md      # Continuation session prompt
└── requirements.txt          # Python dependencies
```

### Generated Project Structure

```
my_project/
├── feature_list.json         # Test cases (source of truth)
├── app_spec.txt              # Copied specification
├── init.sh                   # Environment setup script
├── claude-progress.txt       # Session progress notes
├── .claude_settings.json     # Security settings
└── [application files]       # Generated application code
```

## Key Implementation Patterns

### 1. Agent Loop Pattern

```python
async def run_autonomous_agent(
    project_dir: Path,
    model: str,
    max_iterations: Optional[int] = None,
) -> None:
    """Main autonomous agent loop with session management."""

    # Check if fresh start or continuation
    tests_file = project_dir / "feature_list.json"
    is_first_run = not tests_file.exists()

    while True:
        # Fresh context for each session
        client = create_client(project_dir, model)

        # Choose prompt based on session type
        if is_first_run:
            prompt = get_initializer_prompt()
            is_first_run = False
        else:
            prompt = get_coding_prompt()

        # Run session
        async with client:
            status, response = await run_agent_session(client, prompt, project_dir)

        # Handle continuation logic
        if status == "continue":
            await asyncio.sleep(AUTO_CONTINUE_DELAY_SECONDS)
```

### 2. Security Model Implementation

```python
# Command allowlist in security.py
ALLOWED_COMMANDS = {
    # File inspection
    'ls', 'cat', 'head', 'tail', 'wc', 'grep',
    # Node.js development
    'npm', 'node',
    # Version control
    'git',
    # Process management
    'ps', 'lsof', 'sleep', 'pkill'
}

def validate_command(command: str) -> bool:
    """Validate bash command against security allowlist."""
    # Implementation checks command against allowlist
    # Blocks unauthorized commands for security
```

### 3. Progress Tracking

```python
# Feature tracking in feature_list.json
{
  "features": [
    {
      "id": "feature_001",
      "description": "User authentication system",
      "status": "pending",  // pending, in_progress, passed, failed
      "test_cases": [...],
      "implementation_notes": ""
    },
    // ... 200 features total
  ],
  "session_info": {
    "current_session": 5,
    "total_implemented": 23,
    "last_updated": "2025-12-01T..."
  }
}
```

## Customization Options

### Changing Application Specification

Edit `prompts/app_spec.txt` to specify different applications:

- Modify technology stack
- Adjust feature requirements
- Change UI/UX specifications
- Update success criteria

### Adjusting Feature Count

Edit `prompts/initializer_prompt.md`:

- Change "200 features" to smaller number for faster demos
- Modify test case generation parameters
- Adjust feature complexity requirements

### Modifying Security Settings

Edit `security.py`:

- Add commands to `ALLOWED_COMMANDS`
- Implement additional validation logic
- Configure filesystem restrictions
- Adjust sandbox parameters

## Security Considerations

### Isolation Model

1. **Directory Sandboxing:** All file operations restricted to project directory
2. **Command Filtering:** Only allowlisted bash commands permitted
3. **Context Isolation:** Each session starts with fresh context window
4. **Progress Validation:** Feature implementation tracked and verified

### Allowed Commands

- **File Operations:** `ls`, `cat`, `head`, `tail`, `wc`, `grep`
- **Development Tools:** `npm`, `node`
- **Version Control:** `git`
- **Process Management:** `ps`, `lsof`, `sleep`, `pkill` (dev processes only)

### Blocked Operations

- System-level commands (`rm`, `sudo`, `chmod`, etc.)
- Network access outside project
- File system access outside project directory
- Arbitrary code execution

## Best Practices

### 1. Project Setup

- Always use dedicated project directory
- Ensure adequate disk space for generated code
- Set proper API key with sufficient quota

### 2. Session Management

- Monitor progress via `feature_list.json`
- Use `Ctrl+C` to pause safely
- Resume with same command to continue

### 3. Customization

- Start with smaller feature counts for testing
- Review generated code before running applications
- Adjust security settings based on requirements

### 4. Troubleshooting

- First session may appear to hang (generating test cases)
- Watch for `[Tool: ...]` output to confirm activity
- Check security logs if commands are blocked

## Example Usage Scenarios

### 1. Web Application Development

```bash
# Clone claude.ai specification
python autonomous_agent_demo.py --project-dir ./claude-clone
# Result: Full-stack React/Node.js application with 200+ features
```

### 2. API Development

```bash
# Custom API specification
# Edit prompts/app_spec.txt for API requirements
python autonomous_agent_demo.py --project-dir ./api-project
# Result: Complete REST API with database, authentication, documentation
```

### 3. Testing and Validation

```bash
# Limited run for testing
python autonomous_agent_demo.py --project-dir ./test-project --max-iterations 2
# Result: Initial project setup with basic structure
```

## Integration with Claude Code

### MCP Integration

This skill can be integrated with Claude Code via MCP for enhanced capabilities:

- Direct access from Claude Code interface
- Natural language project initiation
- Real-time progress monitoring
- Automated testing and validation

### Workflow Integration

1. **Specification Phase:** Define requirements in `app_spec.txt`
2. **Initialization Phase:** Agent generates feature list and project structure
3. **Implementation Phase:** Multiple coding sessions build features incrementally
4. **Testing Phase:** Generated applications tested via `init.sh`
5. **Deployment Phase:** Applications ready for deployment

## Performance and Scaling

### Resource Requirements

- **Memory:** 2-4GB recommended for complex applications
- **Storage:** 500MB-2GB depending on application complexity
- **API Tokens:** Significant usage for large projects (200+ features)
- **Processing Time:** Hours for complete applications

### Optimization Strategies

1. **Feature Count Reduction:** Start with 20-50 features for faster demos
2. **Session Batching:** Run specific feature sets in batches
3. **Parallel Development:** Multiple project directories for different aspects
4. **Progressive Enhancement:** Start with basic features, add complexity

## Limitations and Considerations

### Current Limitations

- **Single-threaded execution:** Sequential feature implementation
- **Fixed feature count:** 200 features hardcoded in prompts
- **Language specificity:** Optimized for JavaScript/Node.js and Python
- **Security constraints:** Limited command set for safety

### Future Enhancements

- **Multi-language support:** Extended to Python, Java, C++
- **Dynamic feature generation:** Adaptive feature counting
- **Parallel development:** Concurrent feature implementation
- **Advanced security:** Configurable security policies

---

## Quick Reference Commands

```bash
# Basic usage
python autonomous_agent_demo.py --project-dir ./my-project

# Limited iterations
python autonomous_agent_demo.py --project-dir ./my-project --max-iterations 5

# Specific model
python autonomous_agent_demo.py --project-dir ./my-project --model claude-sonnet-4-5-20250929

# Run generated application
cd ./my-project
./init.sh
npm run dev
```

## Support and Resources

- **GitHub Repository:** [anthropics/claude-quickstarts](https://github.com/anthropics/claude-quickstarts)
- **Claude Code Documentation:** [Claude Code CLI](https://docs.anthropic.com/claude/docs/claude-code)
- **API Documentation:** [Anthropic API](https://docs.anthropic.com/claude/reference)

---

**Generated by Skill Seekers** | Enhanced with Claude Code Max
**Source:** anthropics/claude-quickstarts/autonomous-coding
