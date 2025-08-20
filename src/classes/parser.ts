export class TemplateParser {
  private template: string;

  constructor(htmlTemplate: string) {
    this.template = htmlTemplate;
  }

  render(values: Record<string, string>): string {
    let output = this.template;

    output = output.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      if (key in values) {
        return this.escapeHtml(values[key]);
      }
      return match;
    });

    return output;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
