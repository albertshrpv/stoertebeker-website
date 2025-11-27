import React from "react";
import ReactMarkdown from "react-markdown";

interface Props {
  data: {
    title: string;
    text: string;
  };
}

const TestComponent: React.FC<Props> = ({ data }) => {
  const { title, text } = data;

  return (
    <section className="bg-primary-500-700">
      <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-16 lg:px-12">
        <h1 className="mb-4 mt-8 text-4xl font-extrabold tracking-tight leading-none text-white md:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mb-8 text-lg font-normal text-white lg:text-xl sm:px-16 xl:px-48 ">
          <ReactMarkdown className="prose">{text}</ReactMarkdown>
        </p>
      </div>
    </section>
  );
};

export default TestComponent;
