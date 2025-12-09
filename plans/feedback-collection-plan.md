# Feedback Collection Plan for Bleep That Shit

**Goal:** Capture user feedback from Reddit ad traffic to validate demand and guide feature development (especially the Rails full-stack extension).

---

## Strategy Overview

```
Reddit Ad → Tool Usage → Feedback Form CTA → Google Form → (Optional) Discord
```

- Keep friction low to maximize responses
- Focus on validating demand for premium features (longer videos, saved wordsets)
- Build email list for future announcements

---

## Google Form Setup

### Form Settings

- **No sign-in required** — Reduces friction, especially for teachers on school accounts
- **No "Limit to 1 response"** — Avoids Google sign-in requirement
- **Collect email addresses** — Optional field, not required

### Form Title & Description

**Title:** Quick Feedback - Bleep That Sh\*t

**Description:**

> Thanks for trying the tool! We're building new features and would love your input. This takes ~30 seconds.

### Questions

**1. How did you find this tool?** (Multiple choice)

- Reddit
- Twitter/X
- Google search
- Friend/colleague recommendation
- Other

**2. What's your primary use case?** (Multiple choice)

- Classroom videos (K-12)
- Higher education
- YouTube/content creation
- Podcasting
- Personal use
- Other

**3. What would make this tool more useful for you?** (Checkboxes - select all that apply)

- Longer video support (currently limited to 10 min)
- Save my custom word lists across sessions
- Better transcription accuracy
- More bleep sound options
- Batch processing (multiple files)
- Mobile app
- Other: \_\_\_

**4. Did you hit the 10-minute file limit?** (Multiple choice)

- Yes, and I needed longer
- Yes, but 10 min was enough for my clip
- No, my file was under 10 min

**5. Would you pay for a pro version with longer videos + saved settings?** (Multiple choice)

- Yes, definitely ($5-10/month range)
- Maybe, depends on features
- No, needs to stay free
- I'd pay a one-time fee instead

**6. Any other feedback or feature requests?** (Short answer - optional)

**7. Email (optional, for product updates):**

> We'll only email about major updates. No spam.

### Confirmation Message

> Thanks for your feedback! 🎉
>
> Want to chat with other users or get faster updates? Join our Discord: [your discord link]

---

## CTA Placement on Website

### Location 1: After Successful Export

When user downloads their bleeped video, show:

```
┌─────────────────────────────────────────────────┐
│  ✓ Your video is ready!                         │
│                                                 │
│  Was this helpful? We're building new features. │
│  [Share quick feedback (30 sec) →]              │
└─────────────────────────────────────────────────┘
```

### Location 2: File Too Long Error

When user tries to upload a file over 10 minutes:

```
┌─────────────────────────────────────────────────┐
│  File exceeds 10-minute limit                   │
│                                                 │
│  We're working on longer video support.         │
│  [Get notified when it's ready →]               │
└─────────────────────────────────────────────────┘
```

Link to the same Google Form, or a shorter version that just collects email.

### Location 3: Footer Link

Add a subtle link in the site footer:

```
Feedback | Discord | GitHub
```

---

## Spam Prevention Strategy

### Phase 1: No Protection (Start Here)

- At 70-140 clicks from a small ad test, spam is unlikely
- Teachers are not a spam-prone demographic
- Manually review and delete any junk entries

### Phase 2: If Spam Becomes a Problem

Add these measures:

**Honeypot Field:**

```html
<!-- Hidden field - bots fill it, humans don't see it -->
<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off" />
```

Reject submissions where this field has a value.

**Basic Validation:**

- Reject if submitted in < 3 seconds
- Reject if "Other" fields contain URLs
- Require at least one checkbox selected

### Phase 3: Heavy Spam (Unlikely)

- Switch to Cloudflare Turnstile (free, privacy-friendly CAPTCHA)
- Or enable Google sign-in requirement

---

## Data Analysis Plan

### Key Metrics to Track

1. **Traffic source** — Confirm Reddit ads are driving responses
2. **Use case breakdown** — Is it mostly teachers? Content creators?
3. **Feature demand ranking** — What do users want most?
4. **10-min limit impact** — Are users actually hitting it?
5. **Willingness to pay** — Validate freemium model viability

### Decision Triggers

| Signal                     | Action                                            |
| -------------------------- | ------------------------------------------------- |
| >50% hit 10-min limit      | Prioritize Rails full-stack build                 |
| >30% would pay             | Validate pricing, consider pre-launch list        |
| Most users are teachers    | Double down on education marketing                |
| Most users are creators    | Pivot messaging toward YouTube/podcast angle      |
| "Save wordsets" ranks high | Build Phase 2 of Rails plan (accounts + wordsets) |

---

## Implementation Checklist

- [ ] Create Google Form with questions above
- [ ] Set confirmation message with Discord link
- [ ] Add CTA to site after successful export
- [ ] Add CTA to file-too-long error message
- [ ] Add footer link
- [ ] Test form submission flow
- [ ] Create spreadsheet/view for analyzing responses

---

## Timeline

| Task                                 | When                        |
| ------------------------------------ | --------------------------- |
| Create Google Form                   | Before launching Reddit ads |
| Add CTAs to website                  | Before launching Reddit ads |
| Launch Reddit ads                    | Week 1                      |
| Monitor responses                    | Weeks 1-2                   |
| Analyze data & decide on Rails build | End of Week 2               |

---

## Cost

**$0** — Google Forms is free, CTAs are just HTML/copy changes.

---

## Links

- Google Forms: https://forms.google.com
- Cloudflare Turnstile (if needed later): https://www.cloudflare.com/products/turnstile/
