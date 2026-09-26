const controls = new WeakMap();

// Keep the input and buttons mounted through calculations and range changes.
export function setStepper(input, values, value) {
  let control = controls.get(input);
  if (!control) {
    const wrapper = document.createElement('span');
    wrapper.className = 'level-stepper';
    input.before(wrapper);
    const buttons = [-1, 1].map(direction => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = direction < 0 ? '‹' : '›';
      button.setAttribute('aria-label', `${input.getAttribute('aria-label')} ${direction < 0 ? '降低' : '提高'}`);
      button.addEventListener('click', () => step(direction));
      return button;
    });
    wrapper.append(buttons[0], input, buttons[1]);
    control = {input, values:[], value:'', buttons};
    controls.set(input, control);
    input.autocomplete = 'off';
    const normalize = () => input.value.trim().toUpperCase();
    function commit() {
      const value = normalize();
      if (!control.values.includes(value)) return false;
      control.value = value;
      input.value = value;
      input.setAttribute('aria-invalid', 'false');
      return true;
    }
    function step(direction) {
      if (input.disabled) return;
      const index = control.values.indexOf(control.value);
      input.value = control.values[Math.max(0, Math.min(control.values.length - 1, index + direction))];
      input.dispatchEvent(new Event('change', {bubbles:true}));
    }
    input.addEventListener('change', event => {
      if (!commit()) {
        event.stopImmediatePropagation();
        input.value = control.value;
        input.setAttribute('aria-invalid', 'false');
      }
      refresh(control);
    }, {capture:true});
    input.addEventListener('input', () => {
      input.setAttribute('aria-invalid', String(!control.values.includes(normalize())));
      if (control.values.includes(normalize())) input.dispatchEvent(new Event('change', {bubbles:true}));
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        step(event.key === 'ArrowUp' ? 1 : -1);
      }
      if (event.key === 'Enter') input.dispatchEvent(new Event('change', {bubbles:true}));
    });
  }
  control.values = values.map(String);
  control.value = String(value);
  if (input.value !== control.value) input.value = control.value;
  input.setAttribute('aria-invalid', 'false');
  input.title = control.values.join('、');
  refresh(control);
}

function refresh(control) {
  const index = control.values.indexOf(control.value);
  control.buttons[0].disabled = control.input.disabled || index === 0;
  control.buttons[1].disabled = control.input.disabled || index >= control.values.length - 1;
}
