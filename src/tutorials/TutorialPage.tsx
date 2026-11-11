import { useLayoutEffect, useRef } from 'react';
import { kindNames, type Kind } from '../model';
import { tutorialKinds, tutorials } from './content';
import { TutorialIcon, TutorialIllustration } from './TutorialIllustration';
import { useSwipeSteps } from './useSwipeSteps';
import './tutorial.css';

interface TutorialPageProps {
  kind: Kind | null;
  onSelect: (kind: Kind) => void;
  onReturn: () => void;
  returnLabel: string;
}

function TutorialCatalog({ onSelect }: Pick<TutorialPageProps, 'onSelect'>) {
  return (
    <div className="tutorial-catalog">
      <div className="tutorial-cards">
        {tutorialKinds.map((kind) => (
          <button className="tutorial-card" key={kind} onClick={() => onSelect(kind)}>
            <TutorialIcon kind={kind} />
            <span className="tutorial-card-content">
              <strong>{kindNames[kind]}</strong>
              <span className="tutorial-card-description">{tutorials[kind].description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TutorialReader({
  kind,
  onReturn,
  returnLabel,
}: Omit<TutorialPageProps, 'onSelect'> & { kind: Kind }) {
  const tutorial = tutorials[kind];
  const { stepIndex, dragOffset, dragging, goToStep, swipeHandlers } = useSwipeSteps(
    tutorial.steps.length,
  );
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(0);
  const lastStep = stepIndex === tutorial.steps.length - 1;

  useLayoutEffect(() => {
    if (previousStep.current !== stepIndex) {
      stepHeading.current?.focus({ preventScroll: true });
      stepHeading.current?.closest('.tutorial-step')?.scrollTo({ top: 0 });
      previousStep.current = stepIndex;
    }
  }, [stepIndex]);

  return (
    <div className="tutorial-reader" data-tutorial={kind}>
      <span className="tutorial-step-count" aria-live="polite">
        步骤 {stepIndex + 1} / {tutorial.steps.length}
      </span>
      <div className="tutorial-progress" aria-hidden="true">
        {tutorial.steps.map((item, index) => (
          <span key={item.title} data-complete={index <= stepIndex || undefined} />
        ))}
      </div>
      <div className="tutorial-step-slider" {...swipeHandlers}>
        <div
          className="tutorial-step-track"
          data-dragging={dragging || undefined}
          style={{ transform: `translateX(calc(${-stepIndex * 100}% + ${dragOffset}px))` }}
        >
          {tutorial.steps.map((step, index) => (
            <section
              className="tutorial-step"
              key={step.title}
              inert={index !== stepIndex || undefined}
              aria-hidden={index !== stepIndex || undefined}
              aria-labelledby={`tutorial-step-heading-${index}`}
            >
              <div className="tutorial-step-copy">
                <span className="tutorial-step-number" aria-hidden="true">
                  0{index + 1}
                </span>
                <h2
                  id={`tutorial-step-heading-${index}`}
                  ref={index === stepIndex ? stepHeading : undefined}
                  tabIndex={-1}
                >
                  {step.title}
                </h2>
                <p>{step.instruction}</p>
              </div>
              <figure className="tutorial-figure">
                <div className="tutorial-figure-label">操作示意</div>
                <div className="tutorial-figure-content">
                  <TutorialIllustration illustration={step.illustration} kind={kind} />
                </div>
                <figcaption>{step.caption}</figcaption>
              </figure>
            </section>
          ))}
        </div>
      </div>
      <nav className="tutorial-pagination" aria-label="教程步骤">
        <button disabled={stepIndex === 0} onClick={() => goToStep(stepIndex - 1)}>
          ← 上一步
        </button>
        <button className="primary" onClick={lastStep ? onReturn : () => goToStep(stepIndex + 1)}>
          {lastStep ? returnLabel : '下一步 →'}
        </button>
      </nav>
    </div>
  );
}

export function TutorialPage(props: TutorialPageProps) {
  return props.kind === null ? (
    <TutorialCatalog onSelect={props.onSelect} />
  ) : (
    <TutorialReader key={props.kind} {...props} kind={props.kind} />
  );
}
