import { Fragment } from "react";

export default function MathText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(x\^\d+)/g).map((part, index) => {
        const power = part.match(/^x\^(\d+)$/);
        return power ? (
          <Fragment key={index}>
            x<sup>{power[1]}</sup>
          </Fragment>
        ) : (
          part
        );
      })}
    </>
  );
}
