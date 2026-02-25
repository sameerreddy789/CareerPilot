# Empty State Templates

These HTML snippets can be inserted where data is dynamically loaded.

## Dashboard Empty State
```html
<div class="empty-state">
    <div class="empty-state-icon">📊</div>
    <h3 class="empty-state-title">No Data Yet</h3>
    <p class="empty-state-description">Complete your profile to see personalized insights</p>
    <a href="profile.html" class="btn-primary">Complete Profile</a>
</div>
```

## Resume Empty State
```html
<div class="empty-state">
    <div class="empty-state-icon">📄</div>
    <h3 class="empty-state-title">No Resume Uploaded</h3>
    <p class="empty-state-description">Upload your resume to get AI-powered feedback</p>
    <button onclick="document.getElementById('resumeInput').click()" class="btn-primary">Upload Resume</button>
</div>
```

## Roadmap Empty State
```html
<div class="empty-state">
    <div class="empty-state-icon">🗺️</div>
    <h3 class="empty-state-title">Roadmap Not Generated</h3>
    <p class="empty-state-description">Complete the AI interview to generate your personalized learning roadmap</p>
    <a href="interview.html" class="btn-primary">Start Interview</a>
</div>
```

## Styles (add to styles.css)
```css
.empty-state {
    text-align: center;
    padding: 80px 40px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    margin: 40px 0;
}

.empty-state-icon {
    font-size: 64px;
    margin-bottom: 20px;
    opacity: 0.5;
}

.empty-state-title {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
}

.empty-state-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 24px;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
}
```
