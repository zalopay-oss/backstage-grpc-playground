/* eslint-disable @typescript-eslint/no-use-before-define */
import React from 'react';

interface BadgeProps {
  type: "protoFile" | "service" | "method"
  size?: "small" | "large" 
  children: Node | string | Element
}

export function Badge({ type, children, size }: BadgeProps) {

  return (
    <div style={{
      ...styles.badge,
      ...styles[type],
      ...styles[size || 'small']
    }}>{children}</div>
  )
}

const styles: {[key: string]: any} = {
  badge: {
    lineHeight: "15px",
    fontSize: "11px",
    marginTop: "5px",
    marginRight: "7px",
    paddingBottom: "1px",
  },
  protoFile: {
    backgroundColor: "#15abff",
    color: "#fff"
  },
  service: {
    backgroundColor: "#ffa733",
    color: "#fff",
  },
  method: {
    backgroundColor: "#2cc316",
    color: "#fff",
  },
  large: {
    display: 'inline-block',
    width: '24px',
    height: '24px', 
    lineHeight: '24px',
    textAlign: 'center',
    marginTop: '4px',
  }
};