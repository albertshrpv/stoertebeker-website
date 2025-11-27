import { componentContentPadding } from "../../../lib/utils";
import { Markup } from "react-render-markup";
import { MainButton } from "./MainButton";


interface Props {
    title: string;
    text: string;
    subtitle?: string;
    cta?: {
        label: string;
        onClick: () => void;
    }
}

export default function TitleTextBasic({ title, text, subtitle, cta }: Props) {
    return (
        <section className={`max-w-screen-2xl mx-auto w-full ${componentContentPadding}`}>
            <div className='w-full'>
                {
                    subtitle ? (
                        <div className='text-base lg:text-xl mb-2'>
                            {subtitle}
                        </div>
                    ) : null
                }
                <div className='markup'>
                    <Markup markup={title} />
                </div>
            </div>
            <div className={`w-full ${subtitle ? 'lg:mt-8' : 'mt-8'}`}>
                <div className='markup'>
                    <Markup markup={text} />
                </div>
                {cta && (
                    <div className='flex mt-8 justify-start w-full lg:w-auto'>
                        <MainButton
                            label={cta.label}
                            handleClick={cta.onClick}
                            style="secondary"
                            size="large"
                            className="w-full lg:w-auto"
                        />
                    </div>
                )}
            </div>
        </section>
    );
}