import { Fragment } from 'react';
import {
  mentionSlotOf,
  mentionSlots,
  parseRich,
  type RichNode,
} from '@/lib/richtext';

/**
 * Renders a recap body's markup as React elements.
 *
 * Deliberately not HTML: every node becomes an element this file chose, so a
 * post can never inject markup or script however it was typed. No 'use client'
 * either, so the published page renders it on the server and the editor's
 * preview renders the same tree in the browser.
 */
export function RichText({
  body,
  managers = [],
}: {
  body: string;
  /** The season's managers — used to colour chips and to spot bare @mentions. */
  managers?: string[];
}) {
  const slots = mentionSlots(managers);
  const paragraphs = parseRich(body, managers);

  return (
    <>
      {paragraphs.map((nodes, i) => (
        <p key={i}>
          <Nodes nodes={nodes} slots={slots} />
        </p>
      ))}
    </>
  );
}

function Nodes({
  nodes,
  slots,
}: {
  nodes: RichNode[];
  slots: Record<string, number>;
}) {
  return (
    <>
      {nodes.map((node, i) => (
        <Fragment key={i}>
          <Node node={node} slots={slots} />
        </Fragment>
      ))}
    </>
  );
}

function Node({ node, slots }: { node: RichNode; slots: Record<string, number> }) {
  switch (node.kind) {
    case 'text':
      return <>{node.text}</>;
    case 'break':
      return <br />;
    case 'mention':
      return (
        <span className={`mention mention-${mentionSlotOf(node.name, slots)}`}>
          @{node.name}
        </span>
      );
    case 'highlight':
      return (
        <mark className={`rt-hl rt-hl-${node.colour}`}>
          <Nodes nodes={node.children} slots={slots} />
        </mark>
      );
    case 'mark': {
      const kids = <Nodes nodes={node.children} slots={slots} />;
      if (node.mark === 'bold') return <strong>{kids}</strong>;
      if (node.mark === 'italic') return <em>{kids}</em>;
      if (node.mark === 'underline') return <u>{kids}</u>;
      return <s>{kids}</s>;
    }
  }
}
