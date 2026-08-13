import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  RICH_TEXT_SCHEMA_VERSION,
  type RichTextDocument,
} from '../shared/rich-text-editor/rich-text-document';
import { RichTextEditor } from '../shared/rich-text-editor/rich-text-editor';

const DEMO_DOCUMENT: RichTextDocument = {
  schemaVersion: RICH_TEXT_SCHEMA_VERSION,
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Arrivée à Port Nyanzaru' }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Les personnages découvrent le port sous une pluie chaude. ' },
          { type: 'text', marks: [{ type: 'bold' }], text: 'Syndra' },
          { type: 'text', text: ' leur recommande de rester discrets.' },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Présenter le guide.' }] },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Préparer la prochaine piste.' }],
              },
            ],
          },
        ],
      },
    ],
  },
};

@Component({
  selector: 'app-rich-text-editor-demo',
  imports: [JsonPipe, RichTextEditor, RouterLink],
  templateUrl: './rich-text-editor-demo.html',
  styleUrl: './rich-text-editor-demo.scss',
})
export class RichTextEditorDemo {
  protected readonly document = signal<RichTextDocument>(DEMO_DOCUMENT);
}
