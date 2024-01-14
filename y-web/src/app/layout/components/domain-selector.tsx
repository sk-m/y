import { Component, createSignal } from "solid-js"

import { Link } from "@solidjs/router"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { Popup } from "@/app/components/common/popup/popup"
import { PopupContainer } from "@/app/components/common/popup/popup-container"
import { domainIcon, domainName, useDomain } from "@/app/core/util/use-domain"

import "./domain-selector.less"

type DomainLinkProps = {
  domain: keyof typeof domainName
  to: string

  onHide: () => void
}

const DomainLink: Component<DomainLinkProps> = (props) => {
  return (
    <Link onClick={props.onHide} href={props.to} class="domain-option">
      <div class="link">
        <Icon name={domainIcon[props.domain]} size={18} wght={500} />
        {domainName[props.domain]}
      </div>

      <Icon name="chevron_right" size={18} />
    </Link>
  )
}

export const DomainSelector: Component = () => {
  const { domain } = useDomain()

  const [popupShown, setPopupShown] = createSignal(false)

  const togglePopup = () => setPopupShown((shown) => !shown)

  return (
    <div class="ui-domain-selector">
      <PopupContainer>
        <Button
          variant="text"
          onClick={togglePopup}
          leadingIcon={popupShown() ? "expand_less" : domainIcon[domain()]}
        >
          <div
            style={{
              "font-weight": 450,
            }}
          >
            {domainName[domain()]}
          </div>
        </Button>

        <Popup show={popupShown()} position="left">
          <div class="popup-list">
            <DomainLink onHide={() => setPopupShown(false)} domain="" to="/" />
            <DomainLink
              onHide={() => setPopupShown(false)}
              domain="files"
              to="/files"
            />
            <DomainLink
              onHide={() => setPopupShown(false)}
              domain="admin"
              to="/admin"
            />
          </div>
        </Popup>
      </PopupContainer>
    </div>
  )
}
