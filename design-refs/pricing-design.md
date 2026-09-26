## Pricing Data
- Free: $0 forever
- Pro Monthly: 48 HKD / month
- Pro Yearly (Early bird): 128 HKD / first year
- Pro Yearly (Standard): 228 HKD / year

## Billing Toggle
- Two options: "Pay yearly" (default, active) and "Pay monthly"
- Next to the yearly button, show a badge: "Save 60% with yearly"
- Toggling switches the Pro price:
  - Yearly → 128 HKD / first year
  - Monthly → 48 HKD / month

## Layout
- Centered heading: "Simple pricing." 
  styled with gradient
- Billing toggle centered below subtitle
- Two pricing cards side by side
- Below the cards, add a full comparison table

## Card: Free
- Label: "Free"
- Price: "$0" with "/forever" in muted text
- Description: "For trying out Assemble."
- CTA: "Start free" (outline button, full width)
- Feature list (only Free-specific):
  - Unlimited local notes
  - 1000 total blocks
  - 10 synced notes
  - PDF and HTML export with watermarks

## Card: Pro (Featured)
- Badge: "MOST POPULAR"
- Label: "Pro"
- Price: "128 HKD" with "/first year" in muted text
- Description: "For serious students."
- CTA: "Upgrade to Pro" (gradient button, full width, using --btn-1 to --btn-2)
- Feature list (only Pro-specific):
  - Everything in Free
  - Unlimited blocks
  - Unlimited sync
  - No watermarks
  - Auto backup
  - 30-day version history
  - Priority support

## Featured Card Styling
- Gradient background
- Glowing gradient border (2px) using ::before pseudo-element with mask trick
- Slight scale: transform: scale(1.03)
- Soft glow shadow: 0 20px 60px rgba(251, 108, 193, 0.2)

## Comparison Table
Below the cards, add a full comparison table:

Heading: "Compare all features"

Columns: Feature | Free | Pro

Sections:
### Notes & Blocks
- Local notes: Unlimited | Unlimited
- Total blocks: 1000 | Unlimited
- Pre-built blocks: ✓ | ✓
- LaTeX support: ✓ | ✓

### Sync & Backup
- Synced notes: 10 | Unlimited
- Auto backup: — | ✓
- Version history: — | 30 days

### Export
- PDF export: ✓ (watermark) | ✓ (no watermark)
- Interactive HTML: ✓ (watermark) | ✓

### Support
- Community: ✓ | ✓
- Priority support: — | ✓

Table styling:
- Section headers have light pink background (--card-img-1)
- Rows have subtle border-bottom
- Hover on rows: light pink tint
- First column left-aligned, other columns centered
- Checkmarks use --btn-1 color
- "—" for unavailable features

## Responsive
- Desktop: two cards side by side, table full width
- Mobile (< 768px): cards stack vertically (Pro card first), table scrolls horizontally if needed

## JavaScript
- Billing toggle switches the Pro price and label
- Default state: Yearly (128 HKD / first year)
- Add a simple transition when switching