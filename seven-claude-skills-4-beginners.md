# SKILL vs AGENT Decision Framework

## Step 1: Describe Your Use Case

**What capability are you building?**
[Describe the task, inputs, outputs, and how it will be used]

---

## Step 2: Answer These Critical Questions

### ⏱️ DURATION & AUTONOMY
1. **How long does this typically run?**
   - [ ] Under 5 minutes (quick focused task)
   - [ ] 5-15 minutes (moderate research/analysis)
   - [ ] 30+ minutes (deep autonomous dive)

2. **What's the collaboration model?**
   - [ ] Continuous back-and-forth (user stays engaged)
   - [ ] Ask questions, then autonomous execution (user waits/watches)
   - [ ] Fully autonomous (user delegates and does other work)

### 🧠 CONTEXT SENSITIVITY
3. **If there are 50+ prior messages in the chat, does that:**
   - [ ] HELP (provides project context, tech stack, constraints)
   - [ ] HURT (creates bias, assumptions, noise)
   - [ ] DOESN'T MATTER (task is self-contained)

4. **Does this need a clean slate?**
   - [ ] Yes - fresh analysis with zero assumptions required
   - [ ] No - benefits from knowing what's been discussed
   - [ ] Neutral - can work either way

### 🎯 INVOCATION STYLE
5. **How should this be triggered?**
   - [ ] Auto-detect from keywords (seamless integration)
   - [ ] Explicit delegation ("research this", "analyze that")
   - [ ] Manual command/slash command

6. **Who drives the workflow?**
   - [ ] Claude guides with user input throughout
   - [ ] Runs autonomously with minimal interaction
   - [ ] User directs each step explicitly

### 🔧 COMPLEXITY & SCOPE
7. **What's the complexity level?**
   - [ ] Single focused capability (format, extract, validate)
   - [ ] Multi-step workflow (gather → analyze → synthesize)
   - [ ] Full orchestration (research → plan → execute → validate → document)

8. **Decision points:**
   - [ ] 1-2 simple decisions
   - [ ] 3-5 moderate complexity decisions
   - [ ] 10+ complex interdependent decisions

### 📦 PORTABILITY
9. **Does this work across:**
   - [ ] ALL projects/repos (domain-general methodology)
   - [ ] Specific types of projects (e.g., only web apps)
   - [ ] THIS specific project only (project-specific)

10. **What's the primary nature?**
    - [ ] Teaching Claude HOW to do something (methodology)
    - [ ] Autonomous EXECUTION of a complex workflow

### 📤 OUTPUT FORMAT
11. **What does this produce?**
    - [ ] Quick conversational response/recommendation
    - [ ] Formal documentation/report with artifacts
    - [ ] Code/files/structured deliverables

12. **Is the output:**
    - [ ] Throwaway (quick decision/answer)
    - [ ] Reference documentation (saved for future)
    - [ ] Production deliverable (used in actual project)

---

## Step 3: Decision Matrix

### 🎨 Choose SKILL if majority are:
- ✅ Duration: Under 15 minutes
- ✅ Collaboration: Continuous or guided by Claude
- ✅ Context: Prior conversation HELPS
- ✅ Invocation: Auto-detect from keywords
- ✅ Complexity: Single capability or lightweight workflow
- ✅ Portability: Works across all projects
- ✅ Nature: Methodology/teaching Claude how
- ✅ Output: Conversational or quick artifacts

**SKILL = Enhanced Claude capability that works within conversation flow**

### 🤖 Choose AGENT if majority are:
- ✅ Duration: 30+ minutes
- ✅ Collaboration: User delegates then waits/works elsewhere
- ✅ Context: Prior conversation could CONTAMINATE
- ✅ Invocation: Explicit delegation required
- ✅ Complexity: Full autonomous orchestration
- ✅ Portability: Project-specific or specialized
- ✅ Nature: Autonomous execution of complex workflow
- ✅ Output: Formal deliverables/documentation

**AGENT = Separate entity that runs independently with isolated context**

### 🔧 Choose CUSTOM SLASH COMMAND if:
- Simple utility with no context needed
- One-time setup or configuration
- Direct parameter input → deterministic output
- No conversation or research required

---

## Step 4: Red Flags

### 🚨 DON'T make this a SKILL if:
- "Prior conversation would confuse or bias it"
- "Needs to run for 30+ minutes autonomously"
- "User should delegate and do other work"
- "Requires project-specific deep state"
- "Would break if chat history gets long"

### 🚨 DON'T make this an AGENT if:
- "Benefits from recent project discussion"
- "Quick focused utility (under 5 min)"
- "Works exactly the same on any project"
- "Should feel like Claude getting smarter"
- "User needs to stay engaged throughout"

---

## Step 5: Your Recommendation

**DECISION:** [SKILL / AGENT / SLASH COMMAND]

**PRIMARY REASON:**
[What's the single most important factor?]

**SUPPORTING FACTORS:**
- [Factor 1]
- [Factor 2]
- [Factor 3]

**IMPLEMENTATION NOTES:**
[Key considerations for building this]

**POTENTIAL HYBRID:**
[Could an Agent use this Skill, or vice versa?]

---

## Quick Examples for Calibration

### Clear SKILL Examples:
- **Document formatter** - Quick, portable, auto-triggered
- **Code validator** - Benefits from recent context, focused
- **Epic orchestrator** - Methodology that works anywhere

### Clear AGENT Examples:
- **Security audit** - Needs clean slate, 30+ min autonomous
- **Repo documentation generator** - Full workflow, no prior context
- **Architecture deep research** - Extended autonomous analysis

### SLASH COMMAND Examples:
- **/format-json** - Simple utility, no context needed
- **/create-component [name]** - Deterministic generation
- **/git-commit-msg** - Quick formatter with input