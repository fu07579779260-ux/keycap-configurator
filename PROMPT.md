I want to build a web app: a configurator for 3D-printable keyboard keycaps.

Context: this is one of three configurable 3D-printed consumer products our
team is documenting for a short design workshop (the other two are a perfume
bottle configurator and an eyewear configurator). The keycap configurator
focuses on how the top shape of a keycap affects fingertip contact, comfort
and recognising a key by touch. The first version should offer five base
forms: Flat Top, Concave Top, Convex Top, Angled Top and Tactile Top (raised
dot, ridge or texture). The user picks a form, then adjusts one or two
parameters (e.g. key height, dish depth, slope angle, marker size/position).
The bottom mounting connection stays the same for every form and must fit
the target keyboard. The personalisation flow we want to show is:
select a form → adjust parameters → preview the model → 3D print →
install and test on the keyboard → refine based on feedback.

Before writing any code, interview me about what it needs.
- Ask ONE question at a time and wait for my answer.
- Start broad (who is it for, what should they get at the end), then go
  specific (keycap forms, parameters, ranges, keyboard/switch compatibility,
  mounting stem, key sizes, tactile markers, printers, materials, exports,
  how it should look and feel).
- If my answer is vague, ask a follow-up.
- Suggest options when I'm unsure, but let me decide.
- After about 10–15 questions, summarise what you heard and ask me to confirm.

Then write PLAN.md with: goal, users, inputs → process → outputs,
parameters (name, unit, range), constraints, tech stack, pages,
out of scope, and a build order in small steps. Stop there.

Tech stack (do not change without asking me):
Vite + React + TypeScript + Tailwind CSS. UI components: shadcn/ui.
3D: React Three Fiber + drei. Rhino export: rhino3dm.
